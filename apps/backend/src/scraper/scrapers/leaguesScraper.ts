import { CONFIG } from '../config';
import { restClient } from '../clients/restClient';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';
import { playerResolver } from '../utils/playerResolver';

export function parseCategoryAndGroupName(rawGroupName: string) {
  if (!rawGroupName) return { categoryName: 'General', groupName: 'Group 1' };
  let clean = rawGroupName.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

  // Strip trailing dashes, e.g., "Nationalliga A Herren --" -> "Nationalliga A Herren"
  const cleanNoTrailing = clean.replace(/\s*--+\s*$/, '').trim();

  // 1. Explicit separator " - " or " | "
  if (clean.includes(' - ') || clean.includes(' | ')) {
    const sep = clean.includes(' - ') ? ' - ' : ' | ';
    const parts = clean.split(sep);
    const categoryPart = parts[0].trim();
    const groupPart = parts.slice(1).join(sep).trim();
    return {
      categoryName: categoryPart.replace(/\s*--+\s*$/, '').trim(),
      groupName: groupPart || categoryPart,
    };
  }

  // 2. Multilingual Group Keyword regex (Gruppe, Groupe, Gruppo, Group, Gr., Grp.)
  // Matches e.g. "4. Liga Herren Gruppe 1", "Nationalliga B Herren Gruppe/Groupe 2", "1. Liga Herren Gr. 1"
  const groupRegex = /\s+((?:Gruppe\s*\/\s*Groupe|Groupe\s*\/\s*Gruppe|Gruppe|Groupe|Gruppo|Group|Gr\.|Grp\.)\s+.*)$/i;
  const match = cleanNoTrailing.match(groupRegex);
  if (match) {
    const groupPart = match[1].trim();
    const categoryPart = cleanNoTrailing.slice(0, match.index).trim();
    if (categoryPart.length > 0) {
      return {
        categoryName: categoryPart,
        groupName: groupPart,
      };
    }
  }

  // 3. Trailing indicator without keyword (e.g. "--")
  if (clean.endsWith('--')) {
    return {
      categoryName: cleanNoTrailing || clean,
      groupName: cleanNoTrailing || clean,
    };
  }

  return { categoryName: clean, groupName: clean };
}

export interface MeetingMatchJob {
  meetingId: string | number;
  meta: {
    competitionId?: string | null;
    categoryId?: string | null;
    groupId?: string | null;
  };
}

export async function fetchMeetingMatchesBatch(jobs: MeetingMatchJob[], options: { isIncremental?: boolean; bypassCache?: boolean; concurrency?: number } = {}) {
  const { isIncremental = false, bypassCache = false, concurrency = 15 } = options;
  if (!Array.isArray(jobs) || jobs.length === 0) return 0;

  const queue = [...jobs];
  let totalExtracted = 0;
  let processed = 0;
  const total = jobs.length;
  const t0 = Date.now();

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;

      const { meetingId, meta } = job;
      const encKey = String(meetingId);

      try {
        const meetingData = await restClient.get(`/2014/meetings/${meetingId}`, { bypassCache: isIncremental || bypassCache });
        const rawMatches = meetingData?.match || meetingData?.matches || (Array.isArray(meetingData) ? meetingData : []);

        if (Array.isArray(rawMatches) && rawMatches.length > 0) {
          const matchRecords: any[] = [];
          for (let idx = 0; idx < rawMatches.length; idx++) {
            const match = rawMatches[idx];
            const matchUuid = match.matchUuid || `${encKey}_${idx + 1}`;
            const isDouble = match.gameType === 'double' || /doppel/i.test(match.matchName || '');

            const formatPlayer = (p: any) => {
              if (!p || (!p.playerId && !p.personId && !p.lastname)) return null;
              const name = [p.firstname, p.lastname].filter(Boolean).join(' ').trim();
              const licenceNr = playerResolver.resolveLicence({
                licenceNr: p.playerId ? String(p.playerId) : null,
                personId: p.personId || null,
                name
              });
              return {
                licenceNr: licenceNr || (p.playerId ? String(p.playerId) : null),
                personId: p.personId || null,
                name: name || null,
                fedRank: p.fedRank ?? null,
                playerRank: p.playerRank ?? null,
                nationality: p.nationality || null,
                isSubstitution: !!p.substitution
              };
            };

            const sets: string[] = [];
            for (let s = 1; s <= 7; s++) {
              const homeKey = `set${s}Home`;
              const guestKey = `set${s}Guest`;
              if (match[homeKey] !== undefined && match[guestKey] !== undefined && (match[homeKey] > 0 || match[guestKey] > 0)) {
                sets.push(`${match[homeKey]}:${match[guestKey]}`);
              }
            }

            const setsHome = match.setsHome !== undefined && match.setsHome !== null ? parseInt(match.setsHome, 10) : 0;
            const setsGuest = match.setsGuest !== undefined && match.setsGuest !== null ? parseInt(match.setsGuest, 10) : 0;
            const matchesHome = match.matchesHome !== undefined && match.matchesHome !== null ? parseInt(match.matchesHome, 10) : 0;
            const matchesGuest = match.matchesGuest !== undefined && match.matchesGuest !== null ? parseInt(match.matchesGuest, 10) : 0;
            const setsScore = (setsHome > 0 || setsGuest > 0) ? `${setsHome}:${setsGuest}` : null;

            let winner = 'unplayed';
            if (matchesHome > matchesGuest) {
              winner = 'home';
            } else if (matchesGuest > matchesHome) {
              winner = 'guest';
            } else if (setsHome > setsGuest) {
              winner = 'home';
            } else if (setsGuest > setsHome) {
              winner = 'guest';
            } else if (setsHome > 0 || setsGuest > 0) {
              winner = 'draw';
            }

            const isWalkover = !!(match.homeWo || match.guestWo);
            let matchPosition = match.matchName || (isDouble ? `Doppel ${idx + 1}` : `Einzel ${idx + 1}`);
            if (matchPosition.includes('${doppel}')) {
              matchPosition = `Doppel ${idx + 1}`;
            }

            const homePlayer1 = formatPlayer(match.mmPlayer11);
            const homePlayer2 = isDouble ? formatPlayer(match.mmPlayer12) : null;
            const guestPlayer1 = formatPlayer(match.mmPlayer21);
            const guestPlayer2 = isDouble ? formatPlayer(match.mmPlayer22) : null;

            matchRecords.push({
              matchId: String(matchUuid),
              encounterId: encKey,
              competitionId: meta.competitionId || null,
              categoryId: meta.categoryId || null,
              groupId: meta.groupId ? String(meta.groupId) : null,
              tournamentId: null,
              matchPosition,
              matchType: isDouble ? 'double' : 'single',
              player1Licence: homePlayer1?.licenceNr || null,
              player1PartnerLicence: homePlayer2?.licenceNr || null,
              player2Licence: guestPlayer1?.licenceNr || null,
              player2PartnerLicence: guestPlayer2?.licenceNr || null,
              homePlayer1,
              homePlayer2,
              guestPlayer1,
              guestPlayer2,
              setsScore,
              setsHome,
              setsGuest,
              gamesHome: match.gamesHome !== undefined && match.gamesHome !== null ? parseInt(match.gamesHome, 10) : 0,
              gamesGuest: match.gamesGuest !== undefined && match.gamesGuest !== null ? parseInt(match.gamesGuest, 10) : 0,
              sets,
              winner,
              isWalkover
            });
          }

          if (matchRecords.length > 0) {
            await storageManager.appendBatch('matches', matchRecords);
            totalExtracted += matchRecords.length;
          }
        }

        await stateManager.markCompleted('completed_meeting_matches', encKey);
      } catch (err) {
        // Continue on error
      }

      processed++;
      if (processed % 25 === 0 || processed === total) {
        const rate = Math.round(processed / ((Date.now() - t0) / 1000 || 1));
        process.stdout.write(`\r      ⚡ [Match Breakdown] ${processed}/${total} meetings (${rate} req/s, ${totalExtracted} matches)... `);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');
  return totalExtracted;
}

export async function scrapeLeaguesAndCups(options: {
  targetSeasonNickname?: string | null;
  targetSeasonNicknames?: string[] | null;
  isIncremental?: boolean;
} = {}) {
  const { targetSeasonNickname = null, targetSeasonNicknames = null, isIncremental = false } = options;
  console.log(`🏆 [Leagues & Cups] Starting scrape (Mode: ${isIncremental ? 'Incremental' : 'Full'})...`);

  await playerResolver.load();

  // 1. Load unique seasons
  const seenSeasons = new Set<string>();
  const seasons: any[] = [];

  const explicitNicks = targetSeasonNicknames || (targetSeasonNickname ? [targetSeasonNickname] : null);

  if (explicitNicks && explicitNicks.length > 0) {
    for (const nick of explicitNicks) {
      seasons.push({ seasonNickname: nick });
    }
  } else {
    for await (const s of storageManager.streamRecords('seasons')) {
      if (!seenSeasons.has(s.seasonNickname)) {
        seenSeasons.add(s.seasonNickname);
        seasons.push(s);
      }
    }
  }

  if (seasons.length === 0) {
    console.warn('⚠️ No seasons found. Run seasons scraper first.');
    return;
  }

  const clubsMap = new Map<string, string>();
  for await (const c of storageManager.streamRecords('clubs')) {
    if (c.clubNr) clubsMap.set(String(c.clubNr), c.name);
  }

  const seenCategories = new Set<string>();
  const completedSeasons = await stateManager.getSet('completed_seasons');
  const completedChamps = await stateManager.getSet('championships');
  const completedCategories = await stateManager.getSet('categories');
  const completedGroups = await stateManager.getSet('groups');
  const completedPlayedEncounters = await stateManager.getSet('completed_played_encounters');
  const completedMeetingMatches = await stateManager.getSet('completed_meeting_matches');

  let totalEncounters = 0;
  let totalMatches = 0;
  const concurrency = Math.min(Math.max(CONFIG.concurrency * 2, 45), 60);

  for (let sIdx = 0; sIdx < seasons.length; sIdx++) {
    const season = seasons[sIdx];
    const seasonNick = season.seasonNickname;

    // Check if season was already completed in a previous run
    if (!isIncremental && completedSeasons.has(seasonNick)) {
      console.log(`⏩ [Season ${sIdx + 1}/${seasons.length}] "${seasonNick}" already completed. Skipping.`);
      continue;
    }

    console.log(`\n📅 [Season ${sIdx + 1}/${seasons.length}] Processing Season: "${seasonNick}"...`);

    const chmpsData = await restClient.get(
      `/2014/federations/${CONFIG.fedNickname}/seasons/${encodeURIComponent(seasonNick)}/championships`,
      { bypassCache: isIncremental }
    );
    const championships = chmpsData?.championshipAbbr || chmpsData?.championships || (Array.isArray(chmpsData) ? chmpsData : []);

    if (championships.length === 0) {
      console.log(`   ℹ️ No championships listed for season "${seasonNick}".`);
      await stateManager.markCompleted('completed_seasons', seasonNick);
      continue;
    }

    console.log(`   ↳ Found ${championships.length} championships in season "${seasonNick}".`);

    for (let cIdx = 0; cIdx < championships.length; cIdx++) {
      const chmp = championships[cIdx];
      const chmpNickname = chmp.chmpNickname || chmp.nickname || chmp.name;
      if (!chmpNickname) continue;

      const compKey = `${seasonNick}__${chmpNickname}`;
      const competitionId = `comp_league_${compKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      // 1. Record Competition
      const isCup = /cup|pokal/i.test(chmp.name || chmpNickname);
      const competitionRecord = {
        competitionId,
        type: isCup ? 'cup' : 'league',
        name: chmp.name || chmpNickname,
        seasonNickname: seasonNick,
        association: chmp.regionName || chmp.association || CONFIG.fedNickname,
        startDate: season.startDate || null,
        endDate: season.endDate || null,
        organizer: chmp.organizer || CONFIG.fedNickname
      };

      if (!isIncremental || !completedChamps.has(compKey)) {
        await storageManager.appendRecord('competitions', competitionRecord);
        await stateManager.markCompleted('championships', compKey);
      }

      // 2. Fetch Groups & Categories
      const groupsData = await restClient.get(
        `/2014/federations/${CONFIG.fedNickname}/seasons/${encodeURIComponent(seasonNick)}/championships/${encodeURIComponent(chmpNickname)}/groups`,
        { bypassCache: isIncremental }
      );
      const groups = groupsData?.groupAbbr || groupsData?.groups || (Array.isArray(groupsData) ? groupsData : []);

      console.log(`   ↳ [${cIdx + 1}/${championships.length}] Championship: "${chmp.name || chmpNickname}" (${groups.length} groups)`);

      const groupCategoryMap = new Map<string, { categoryId: string; categoryName: string; groupName: string; rawGroupName: string }>();
      for (const g of groups) {
        const groupId = g.groupId || g.id;
        if (!groupId) continue;
        const gId = String(groupId);
        const rawGroupName = g.name || g.groupNickname || `Group ${gId}`;
        const { categoryName, groupName } = parseCategoryAndGroupName(rawGroupName);
        const categoryId = `cat_${competitionId}_${categoryName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

        groupCategoryMap.set(gId, { categoryId, categoryName, groupName, rawGroupName });

        if (!isIncremental || !completedCategories.has(categoryId)) {
          if (!seenCategories.has(categoryId)) {
            seenCategories.add(categoryId);
            const categoryRecord = {
              categoryId,
              competitionId,
              name: categoryName,
              gender: /damen|women|frauen/i.test(categoryName) ? 'Women' : (/herren|men|männer/i.test(categoryName) ? 'Men' : 'Mixed'),
              ageGroup: /u11|u13|u15|u17|u18|u19|nachwuchs|youth|junioren/i.test(categoryName) ? 'Youth' : (/o40|o50|o60|o70|senioren/i.test(categoryName) ? 'Seniors' : 'Active')
            };
            await storageManager.appendRecord('categories', categoryRecord);
            await stateManager.markCompleted('categories', categoryId);
          }
        }
      }

      // Concurrently fetch group tables for all groups needing update
      const pendingGroups = groups.filter((g: any) => {
        const gId = String(g.groupId || g.id || '');
        return gId && (!isIncremental || !completedGroups.has(gId));
      });

      if (pendingGroups.length > 0) {
        const groupQueue = [...pendingGroups];
        const groupWorkers = Array.from({ length: Math.min(pendingGroups.length, 8) }, async () => {
          while (groupQueue.length > 0) {
            const g = groupQueue.shift();
            if (!g) break;
            const gId = String(g.groupId || g.id);
            const catInfo = groupCategoryMap.get(gId);
            const categoryId = catInfo ? catInfo.categoryId : `cat_${competitionId}_general`;
            const groupName = catInfo ? catInfo.groupName : (g.name || `Group ${gId}`);

            let teams: any[] = [];
            try {
              const tableData = await restClient.get(`/2014/groups/${gId}/table`, { bypassCache: isIncremental });
              const rawTeams = tableData?.groupTableTeam || tableData?.groupTable || tableData?.teams || (Array.isArray(tableData) ? tableData : []);
              teams = rawTeams.map((t: any) => {
                const cNr = t.clubNr ? String(t.clubNr) : null;
                return {
                  tableRank: t.tableRank ?? null,
                  teamId: t.teamId ? String(t.teamId) : (t.id ? String(t.id) : null),
                  teamName: t.team || t.teamName || t.name || '',
                  teamNr: t.teamNr ?? null,
                  clubNr: cNr,
                  clubName: t.clubName || (cNr && clubsMap.get(cNr)) || '',
                  meetingsPlayed: t.meetings ?? null,
                  ownPoints: t.ownPoints ?? null,
                  otherPoints: t.otherPoints ?? null,
                  ownMatches: t.ownMatches ?? null,
                  otherMatches: t.otherMatches ?? null,
                  ownSets: t.ownSets ?? null,
                  otherSets: t.otherSets ?? null,
                  ownGames: t.ownGames ?? null,
                  otherGames: t.otherGames ?? null
                };
              });
            } catch {}

            const groupRecord = {
              groupId: gId,
              categoryId,
              competitionId,
              name: groupName,
              teams
            };
            await storageManager.appendRecord('groups', groupRecord);
            await stateManager.markCompleted('groups', gId);
          }
        });
        await Promise.all(groupWorkers);
      }

      // 3. Encounters & Matches
      const meetingMatchJobs: MeetingMatchJob[] = [];

      // Try regionMeetings fast-path
      let regionMeetingsList: any[] = [];
      try {
        const regData = await restClient.get(
          `/2014/federations/${CONFIG.fedNickname}/seasons/${encodeURIComponent(seasonNick)}/championships/${encodeURIComponent(chmpNickname)}/regionMeetings`,
          { bypassCache: isIncremental }
        );
        regionMeetingsList = regData?.meetings?.meetingAbbr || [];
      } catch {
        regionMeetingsList = [];
      }

      if (regionMeetingsList.length > 0) {
        for (const m of regionMeetingsList) {
          const meetingId = m.meetingId || m.id;
          if (!meetingId) continue;
          const encKey = String(meetingId);
          const gId = String(m.groupId || '');

          const isPlayed = m.matchesHome !== null && m.matchesHome !== undefined;
          const isAlreadyDone = completedPlayedEncounters.has(encKey);

          if (!isAlreadyDone) {
            const catInfo = groupCategoryMap.get(gId);
            const categoryId = catInfo ? catInfo.categoryId : `cat_${competitionId}_general`;

            const scoreHome = isPlayed ? parseInt(m.matchesHome, 10) : null;
            const scoreGuest = isPlayed ? parseInt(m.matchesGuest, 10) : null;

            const encounterRecord = {
              encounterId: encKey,
              groupId: gId,
              categoryId,
              competitionId,
              date: m.scheduled || m.endDate || null,
              homeTeam: m.teamHome || '',
              guestTeam: m.teamGuest || '',
              homeClubNr: m.teamHomeClubNr || null,
              guestClubNr: m.teamGuestClubNr || null,
              homeTeamId: m.teamHomeId || null,
              guestTeamId: m.teamGuestId || null,
              scoreHome,
              scoreGuest,
              setsHome: m.setsHome ?? null,
              setsGuest: m.setsGuest ?? null,
              roundName: m.roundName || (m.meetingNumber ? `Round ${m.meetingNumber}` : null),
              isPlayed
            };

            await storageManager.appendRecord('encounters', encounterRecord);
            if (isPlayed) {
              await stateManager.markCompleted('completed_played_encounters', encKey);
            }
            totalEncounters++;
          }

          if (isPlayed && !completedMeetingMatches.has(encKey)) {
            const catInfo = groupCategoryMap.get(gId);
            meetingMatchJobs.push({
              meetingId: encKey,
              meta: { competitionId, categoryId: catInfo?.categoryId, groupId: gId }
            });
          }
        }
      } else {
        // Fallback for historical / closed seasons: fetch meetings per group concurrently
        const groupMeetingsQueue = [...groups];
        const groupMeetingsWorkers = Array.from({ length: Math.min(groups.length, 8) }, async () => {
          while (groupMeetingsQueue.length > 0) {
            const g = groupMeetingsQueue.shift();
            if (!g) break;
            const groupId = g.groupId || g.id;
            if (!groupId) continue;

            const gId = String(groupId);
            const catInfo = groupCategoryMap.get(gId);
            const categoryId = catInfo ? catInfo.categoryId : `cat_${competitionId}_general`;

            const meetingsData = await restClient.get(`/2014/groups/${groupId}/meetings`, { bypassCache: isIncremental });
            const meetings = meetingsData?.meetingAbbr || meetingsData?.meetings || (Array.isArray(meetingsData) ? meetingsData : []);

            for (const m of meetings) {
              const meetingId = m.meetingId || m.id;
              if (!meetingId) continue;
              const encKey = String(meetingId);

              const isPlayed = m.matchesHome !== null && m.matchesHome !== undefined;
              const isAlreadyDone = completedPlayedEncounters.has(encKey);

              if (!isAlreadyDone) {
                const scoreHome = isPlayed ? parseInt(m.matchesHome, 10) : null;
                const scoreGuest = isPlayed ? parseInt(m.matchesGuest, 10) : null;

                const encounterRecord = {
                  encounterId: encKey,
                  groupId: gId,
                  categoryId,
                  competitionId,
                  date: m.scheduled || m.endDate || null,
                  homeTeam: m.teamHome || '',
                  guestTeam: m.teamGuest || '',
                  homeClubNr: m.teamHomeClubNr || null,
                  guestClubNr: m.teamGuestClubNr || null,
                  homeTeamId: m.teamHomeId || null,
                  guestTeamId: m.teamGuestId || null,
                  scoreHome,
                  scoreGuest,
                  setsHome: m.setsHome ?? null,
                  setsGuest: m.setsGuest ?? null,
                  roundName: m.roundName || (m.meetingNumber ? `Round ${m.meetingNumber}` : null),
                  isPlayed
                };

                await storageManager.appendRecord('encounters', encounterRecord);
                if (isPlayed) {
                  await stateManager.markCompleted('completed_played_encounters', encKey);
                }
                totalEncounters++;
              }

              if (isPlayed && !completedMeetingMatches.has(encKey)) {
                meetingMatchJobs.push({
                  meetingId: encKey,
                  meta: { competitionId, categoryId, groupId: gId }
                });
              }
            }
          }
        });
        await Promise.all(groupMeetingsWorkers);
      }

      // Concurrently batch extract individual match details for this championship
      if (meetingMatchJobs.length > 0) {
        console.log(`      ↳ Extracting ${meetingMatchJobs.length} played meeting breakdowns in parallel...`);
        const extracted = await fetchMeetingMatchesBatch(meetingMatchJobs, {
          isIncremental,
          concurrency
        });
        totalMatches += extracted;
      }
    }

    // Mark whole season completed
    await stateManager.markCompleted('completed_seasons', seasonNick);
    console.log(`   ✨ [Season ${sIdx + 1}/${seasons.length}] "${seasonNick}" finished & checkpointed!`);
  }

  console.log(`\n✅ [Leagues & Cups] Finished (${totalEncounters} encounters, ${totalMatches} matches recorded).`);
}

