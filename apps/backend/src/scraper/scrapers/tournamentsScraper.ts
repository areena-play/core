import { CONFIG } from '../config';
import { webSession } from '../clients/webSession';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';
import { playerResolver } from '../utils/playerResolver';

export function parseTournamentEndDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map((s) => s.trim());
  const target = parts[parts.length - 1];
  const match = target.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    const [_, d, m, y] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59);
  }
  return null;
}

export async function fetchCalendarTournaments(startYear = 2014, endYear = 2030, options: any = {}) {
  const tournamentsMap = new Map<string, any>();

  for (let year = startYear; year <= endYear; year++) {
    const periods = [
      { from: `01.07.${year}`, to: `31.12.${year}` },
      { from: `01.01.${year + 1}`, to: `30.06.${year + 1}` }
    ];

    for (const p of periods) {
      const url = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/tournamentCalendar?queryDateFrom=${p.from}&queryDateTo=${p.to}&tournamentType=-1%3B&federation=${encodeURIComponent(CONFIG.fedNickname)}&queryYoungOld=WONoSelectionString&compType=WONoSelectionString&queryOrganizer=WONoSelectionString&queryCompRegion=WONoSelectionString&queryRegion=WONoSelectionString`;

      try {
        const { ok, html } = await webSession.fetchPage(url, { noAutoLogin: true });
        if (!ok) continue;

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;

        while ((rowMatch = rowRegex.exec(html)) !== null) {
          const row = rowMatch[1];
          const tIdMatch = row.match(/tournament=(\d+)/);
          if (!tIdMatch) continue;
          const tournamentId = tIdMatch[1];

          if (!tournamentsMap.has(tournamentId)) {
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let cellMatch: RegExpExecArray | null;
            while ((cellMatch = cellRegex.exec(row)) !== null) {
              cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
            }

            if (cells.length >= 3) {
              const rawName = cells[1] || '';
              const nameParts = rawName.split('\n').map((s) => s.trim()).filter(Boolean);
              const name = nameParts[0] || rawName;
              const hostName = nameParts.length > 1 ? nameParts[1] : '';

              tournamentsMap.set(tournamentId, {
                tournamentId,
                date: cells[0] || '',
                name,
                hostName,
                regionName: cells[2] || '',
                organizer: cells[3] || '',
                targetGroup: cells[4] || ''
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Failed to fetch tournament calendar for ${p.from}-${p.to}:`, err.message);
      }
    }
  }

  return Array.from(tournamentsMap.values());
}

export async function fetchTournamentDetail(tournamentId: string) {
  const url = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/tournamentCalendarDetail?federation=${encodeURIComponent(CONFIG.fedNickname)}&tournament=${encodeURIComponent(tournamentId)}`;
  try {
    const { ok, html } = await webSession.fetchPage(url);
    if (!ok) return null;

    const compRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    const categories: any[] = [];

    while ((rowMatch = compRegex.exec(html)) !== null) {
      const row = rowMatch[1];
      const compIdMatch = row.match(/competition=(\d+)/);
      if (!compIdMatch) continue;
      const compId = compIdMatch[1];

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
      }

      categories.push({
        competitionId: compId,
        name: cells[0] || '',
        category: cells[1] || '',
        scheduleText: cells[2] || '',
        hasResults: cells.some((c) => /ergebnisse|yes|ja/i.test(c))
      });
    }

    return { tournamentId, categories };
  } catch (err) {
    return null;
  }
}

export async function fetchTournamentMatches(compId: string) {
  const url = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/tournamentMatchesReport?federation=${encodeURIComponent(CONFIG.fedNickname)}&competition=${encodeURIComponent(compId)}`;
  try {
    const { ok, html } = await webSession.fetchPage(url);
    if (!ok) return [];

    const matches: any[] = [];
    let currentRound = 'Hauptfeld';

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1];

      // Check for round headers: <h2>, <h3>, or <th> with colspan
      const headerMatch = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/i.exec(row) || /<th[^>]*colspan[^>]*>(.*?)<\/th>/i.exec(row);
      if (headerMatch) {
        const roundTitle = headerMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (roundTitle && !/spiel|datum|forfait|sätze/i.test(roundTitle)) {
          currentRound = roundTitle;
          continue;
        }
      }

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
      }

      // If this row is a round name container (single cell)
      if (cells.length === 1 && cells[0].length > 1 && !/spiel|datum|forfait|sätze/i.test(cells[0])) {
        currentRound = cells[0];
        continue;
      }

      // Table row format:
      // [scheduled, matchNr, player1Name, player2Name, set1, set2, set3, set4, set5, set6, set7, forfait, setsScore, gamesScore]
      if (cells.length >= 8 && cells[1] && /^\d+$/.test(cells[1])) {
        const scheduled = cells[0] || null;
        const matchNr = parseInt(cells[1], 10);
        const player1Raw = cells[2] || '';
        const player2Raw = cells[3] || '';

        if (!player1Raw || !player2Raw || player1Raw === '-' || player2Raw === '-') continue;

        // Parse sets: cells[4] up to cells[cells.length - 3]
        const setScores: string[] = [];
        for (let i = 4; i < cells.length - 3; i++) {
          const val = cells[i];
          if (val && val !== '-' && /^\d+:\d+$/.test(val)) {
            setScores.push(val);
          }
        }

        const forfaitVal = cells[cells.length - 3] || '';
        const setsScoreVal = cells[cells.length - 2] || '';
        const matchWinnerScore = cells[cells.length - 1] || '';

        const isWalkover = /w\.?o\.?|forfait|wo/i.test(forfaitVal) || /w\.?o\.?|forfait|wo/i.test(setsScoreVal);

        matches.push({
          roundName: currentRound,
          matchNr,
          scheduled,
          player1Raw,
          player2Raw,
          setsScore: setsScoreVal !== '-' ? setsScoreVal : null,
          matchWinnerScore: matchWinnerScore !== '-' ? matchWinnerScore : null,
          sets: setScores,
          isWalkover
        });
      }
    }

    return matches;
  } catch (err) {
    return [];
  }
}

export async function scrapeTournaments(options: { isIncremental?: boolean; forceFresh?: boolean } = {}) {
  const { isIncremental = false, forceFresh = false } = options;
  console.log(`🏓 [Tournaments] Starting HTML scraper (Mode: ${isIncremental ? 'Incremental (30d retrospective)' : 'Full History'})...`);

  await playerResolver.load();

  const currentYear = new Date().getFullYear();
  const startYear = isIncremental ? currentYear - 1 : 2014;
  const endYear = currentYear + 1;

  const tournamentList = await fetchCalendarTournaments(startYear, endYear, options);
  console.log(`📅 Found ${tournamentList.length} tournament entries in calendar.`);

  const completedSet = forceFresh ? new Set<string>() : await stateManager.getSet('tournaments');

  // Filter tournaments needing processing
  const pendingTournaments: any[] = [];
  for (const t of tournamentList) {
    const tId = String(t.tournamentId);
    const isCompleted = completedSet.has(tId);

    if (!forceFresh && isCompleted) {
      continue; // Tournament already completed (contains matches or >30 days old)
    }

    pendingTournaments.push(t);
  }

  console.log(`🎯 [Tournaments] Processing ${pendingTournaments.length} pending tournaments (${tournamentList.length - pendingTournaments.length} skipped as already completed)...`);

  if (pendingTournaments.length === 0) {
    console.log('✅ [Tournaments] All tournaments are already processed.');
    return;
  }

  let processedCount = 0;
  let matchesCount = 0;
  let currentIndex = 0;
  const concurrency = Math.min(Math.max(CONFIG.concurrency || 15, 10), 30);
  const t0 = Date.now();

  async function worker() {
    while (currentIndex < pendingTournaments.length) {
      const idx = currentIndex++;
      const t = pendingTournaments[idx];
      const tId = String(t.tournamentId);

      try {
        const compId = `tourn_${tId}`;
        const compRecord = {
          competitionId: compId,
          type: 'tournament',
          name: t.name,
          seasonNickname: null,
          association: t.regionName || CONFIG.fedNickname,
          startDate: t.date || null,
          endDate: t.date || null,
          organizer: t.organizer || t.hostName || ''
        };

        let tournamentMatchesCount = 0;
        const tournamentCategories: any[] = [];
        const tournamentEncounters: any[] = [];
        const tournamentMatches: any[] = [];

        // Fetch tournament categories
        const detail = await fetchTournamentDetail(tId);
        if (detail && detail.categories) {
          for (const cat of detail.categories) {
            const catId = `cat_${compId}_${cat.competitionId}`;
            const catRecord = {
              categoryId: catId,
              competitionId: compId,
              name: cat.name || cat.category,
              gender: /damen|women|frauen/i.test(cat.name) ? 'Women' : (/herren|men|männer/i.test(cat.name) ? 'Men' : 'Mixed'),
              ageGroup: /u11|u13|u15|u17|u18|u19|nachwuchs|youth|junioren/i.test(cat.name) ? 'Youth' : (/o40|o50|o60|o70|senioren/i.test(cat.name) ? 'Seniors' : 'Active')
            };
            tournamentCategories.push(catRecord);

            // Fetch tournament matches
            const matches = await fetchTournamentMatches(cat.competitionId);
            const batchEncounters: any[] = [];
            const batchMatches: any[] = [];

            for (let mIdx = 0; mIdx < matches.length; mIdx++) {
              const m = matches[mIdx];
              const matchId = `match_tourn_${cat.competitionId}_${mIdx + 1}`;
              const encId = `enc_tourn_${cat.competitionId}_${mIdx + 1}`;

              const isDouble = (m.player1Raw || '').includes('/') || (m.player2Raw || '').includes('/');

              let p1Name = m.player1Raw || '';
              let p1PartnerName: string | null = null;
              let p2Name = m.player2Raw || '';
              let p2PartnerName: string | null = null;

              if (isDouble) {
                const p1Parts = p1Name.split('/').map((s: string) => s.trim());
                p1Name = p1Parts[0] || '';
                p1PartnerName = p1Parts[1] || null;

                const p2Parts = p2Name.split('/').map((s: string) => s.trim());
                p2Name = p2Parts[0] || '';
                p2PartnerName = p2Parts[1] || null;
              }

              const player1Licence = playerResolver.resolveLicence({ name: p1Name });
              const player1PartnerLicence = p1PartnerName ? playerResolver.resolveLicence({ name: p1PartnerName }) : null;
              const player2Licence = playerResolver.resolveLicence({ name: p2Name });
              const player2PartnerLicence = p2PartnerName ? playerResolver.resolveLicence({ name: p2PartnerName }) : null;

              let setsHome = 0;
              let setsGuest = 0;
              let winner = 'unplayed';

              if (m.setsScore && m.setsScore.includes(':')) {
                const [sH, sG] = m.setsScore.split(':').map((x: string) => parseInt(x.trim(), 10));
                if (!isNaN(sH)) setsHome = sH;
                if (!isNaN(sG)) setsGuest = sG;
                if (setsHome > setsGuest) winner = 'home';
                else if (setsGuest > setsHome) winner = 'guest';
                else if (setsHome > 0 || setsGuest > 0) winner = 'draw';
              } else if (m.isWalkover) {
                if (m.matchWinnerScore && /^[1-9]/.test(m.matchWinnerScore)) winner = 'home';
                else if (m.matchWinnerScore && /:[1-9]/.test(m.matchWinnerScore)) winner = 'guest';
                else if (m.setsScore && /^[1-9]/.test(m.setsScore)) winner = 'home';
                else if (m.setsScore && /:[1-9]/.test(m.setsScore)) winner = 'guest';
              }

              let gamesHome = 0;
              let gamesGuest = 0;
              for (const s of m.sets) {
                const [gh, gg] = s.split(':').map(Number);
                if (!isNaN(gh)) gamesHome += gh;
                if (!isNaN(gg)) gamesGuest += gg;
              }

              const p1Meta = player1Licence ? playerResolver.getPlayer(player1Licence) : null;
              const p2Meta = player2Licence ? playerResolver.getPlayer(player2Licence) : null;

              const homePlayer1 = {
                licenceNr: player1Licence,
                name: p1Name,
                clubNr: p1Meta?.clubNr || null,
                clubName: p1Meta?.clubName || null
              };
              const homePlayer2 = p1PartnerName ? {
                licenceNr: player1PartnerLicence,
                name: p1PartnerName,
                clubNr: null,
                clubName: null
              } : null;

              const guestPlayer1 = {
                licenceNr: player2Licence,
                name: p2Name,
                clubNr: p2Meta?.clubNr || null,
                clubName: p2Meta?.clubName || null
              };
              const guestPlayer2 = p2PartnerName ? {
                licenceNr: player2PartnerLicence,
                name: p2PartnerName,
                clubNr: null,
                clubName: null
              } : null;

              batchMatches.push({
                matchId,
                encounterId: encId,
                competitionId: compId,
                categoryId: catId,
                groupId: null,
                tournamentId: tId,
                matchPosition: m.roundName || (m.matchNr ? `Match ${m.matchNr}` : `Match ${mIdx + 1}`),
                matchType: isDouble ? 'double' : 'single',
                player1Licence,
                player1PartnerLicence,
                player2Licence,
                player2PartnerLicence,
                homePlayer1,
                homePlayer2,
                guestPlayer1,
                guestPlayer2,
                setsScore: m.setsScore || (m.sets.length > 0 ? `${setsHome}:${setsGuest}` : null),
                setsHome,
                setsGuest,
                gamesHome,
                gamesGuest,
                sets: m.sets,
                winner,
                isWalkover: m.isWalkover
              });

              batchEncounters.push({
                encounterId: encId,
                groupId: null,
                categoryId: catId,
                competitionId: compId,
                date: m.scheduled || t.date || null,
                homeTeam: m.player1Raw,
                guestTeam: m.player2Raw,
                homeClubNr: p1Meta?.clubNr || null,
                guestClubNr: p2Meta?.clubNr || null,
                scoreHome: setsHome || null,
                scoreGuest: setsGuest || null,
                setsHome,
                setsGuest,
                roundName: m.roundName || (m.matchNr ? `Match ${m.matchNr}` : null),
                isPlayed: Boolean(m.setsScore && m.setsScore !== '-' && !m.isWalkover) || m.isWalkover
              });
            }

            if (batchEncounters.length > 0) {
              tournamentEncounters.push(...batchEncounters);
            }
            if (batchMatches.length > 0) {
              tournamentMatches.push(...batchMatches);
              tournamentMatchesCount += batchMatches.length;
            }
          }
        }

        // Only persist and mark completed if tournament contains some matches OR is > 30 days in the past
        const endDate = parseTournamentEndDate(t.date);
        const isOlderThan30Days = endDate && (Date.now() - endDate.getTime()) > 30 * 24 * 60 * 60 * 1000;

        if (tournamentMatchesCount > 0 || isOlderThan30Days) {
          await storageManager.appendRecord('competitions', compRecord);
          for (const catRec of tournamentCategories) {
            await storageManager.appendRecord('categories', catRec);
          }
          if (tournamentEncounters.length > 0) {
            await storageManager.appendBatch('encounters', tournamentEncounters);
          }
          if (tournamentMatches.length > 0) {
            await storageManager.appendBatch('matches', tournamentMatches);
            matchesCount += tournamentMatches.length;
          }
          await stateManager.markCompleted('tournaments', tId);
        }
      } catch (err) {
        // Continue on error
      }

      processedCount++;
      if (processedCount % 10 === 0 || processedCount === pendingTournaments.length) {
        const rate = Math.round(processedCount / ((Date.now() - t0) / 1000 || 1));
        process.stdout.write(`   ↳ [${processedCount}/${pendingTournaments.length}] Tournaments scraped (${rate} t/s, Matches: ${matchesCount})\r`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');

  console.log(`✅ [Tournaments] Completed tournament scraping (${processedCount} processed, ${matchesCount} matches).`);
}
