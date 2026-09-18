import { CONFIG } from '../config';
import { webSession } from '../clients/webSession';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAvailableRankingDates(): Promise<string[]> {
  const url = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/eloFilter?federation=${encodeURIComponent(CONFIG.fedNickname)}`;
  try {
    const { ok, html } = await webSession.fetchPage(url);
    if (!ok) return [];

    const options = html.match(/<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/gi) || [];
    const dateSet = new Set<string>();
    const dates: string[] = [];

    for (const opt of options) {
      const match = opt.match(/value="(\d{2}\.\d{2}\.\d{4})"/);
      if (match && !dateSet.has(match[1])) {
        dateSet.add(match[1]);
        dates.push(match[1]);
      }
    }

    dates.sort((a, b) => {
      const [d1, m1, y1] = a.split('.').map(Number);
      const [d2, m2, y2] = b.split('.').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });

    return dates;
  } catch (err: any) {
    console.warn('⚠️ Failed to fetch live ranking dates:', err.message);
    return [];
  }
}

export function parseSinglePageElo(html: string, overrideLicenceNr: string | null = null, rankingUrl: string | null = null) {
  let licenceNr = overrideLicenceNr ? String(overrideLicenceNr) : null;
  let club: string | null = null;
  let ageclass: string | null = null;
  let classification: string | null = null;
  let playerName: string | null = null;

  const titleMatch = html.match(/<h1>\s*Elo-Protokoll\s*<br\s*\/?>\s*([^<]+)\s*<\/h1>/i);
  if (titleMatch) playerName = titleMatch[1].trim();

  const licMatch = html.match(/<b>License-No\.<\/b>\s*<\/td>\s*<td>\s*(\d+)/i);
  if (licMatch) licenceNr = licMatch[1].trim();

  const clubMatch = html.match(/<b>Club<\/b>\s*<\/td>\s*<td>\s*<a[^>]*>([^<]+)<\/a>/i);
  if (clubMatch) club = clubMatch[1].trim();

  const classMatch = html.match(/<b>Classification<\/b>\s*<\/td>\s*<td>\s*([^<]+)/i);
  if (classMatch) classification = classMatch[1].trim();

  const ageMatch = html.match(/<b>Ageclass<\/b>\s*<\/td>\s*<td>\s*([^<]+)/i);
  if (ageMatch) ageclass = ageMatch[1].trim();

  const eventMatches = [...html.matchAll(/<div id="events\.([^"]+)"[^>]*>([\s\S]*?)(?=(?:<div id="events\.|\s*<div id="content-row2"|\s*<\/div>\s*<\/div>\s*<\/div>\s*<div id="footer"))/gi)];

  const history: any[] = [];

  for (const match of eventMatches) {
    const rankingDate = match[1].trim();
    const block = match[2];

    const eloMatch = block.match(/<b>Elo-Wert<\/b><\/td>\s*<td[^>]*>([\d\s]+)<\/td>/i);
    const deltaMatch = block.match(/<b>Elo-Wert Delta<\/b><\/td>\s*<td[^>]*>([\+\-\d\,\.\s]+)<\/td>/i);
    const classProgMatch = block.match(/<b>Classification\s*(?:\(Prognose\))?<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    const classMenMatch = block.match(/<b>Classification Men\s*(?:\(Prognose\))?<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    const classWomenMatch = block.match(/<b>Classification (?:Women|Woman|Damen)\s*(?:\(Prognose\))?<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    const rankMenMatch = block.match(/<b>Platzierung Men<\/b><\/td>\s*<td[^>]*>([\d\s]+)<\/td>/i);
    const rankWomenMatch = block.match(/<b>Platzierung (?:Woman|Women|Damen)<\/b><\/td>\s*<td[^>]*>([\d\s]+)<\/td>/i);
    const rankTotalMatch = block.match(/<b>Platzierung Gesamt<\/b><\/td>\s*<td[^>]*>([\d\s]+)<\/td>/i);
    const ageClassPeriodMatch = block.match(/<b>Ageclass<\/b><\/td>\s*<td[^>]*>([^<]+)<\/td>/i);

    const elo = eloMatch ? parseInt(eloMatch[1].replace(/\s+/g, ''), 10) : null;
    const deltaStr = deltaMatch ? deltaMatch[1].replace(/\s+/g, '').replace(',', '.') : '0';
    const delta = parseFloat(deltaStr) || 0;
    const rankMen = rankMenMatch ? parseInt(rankMenMatch[1].replace(/\s+/g, ''), 10) : null;
    const rankWomen = rankWomenMatch ? parseInt(rankWomenMatch[1].replace(/\s+/g, ''), 10) : null;
    const rankTotal = rankTotalMatch ? parseInt(rankTotalMatch[1].replace(/\s+/g, ''), 10) : null;
    const classPeriod = classProgMatch ? classProgMatch[1].trim() : null;
    const classMenPeriod = classMenMatch ? classMenMatch[1].trim() : null;
    const classWomenPeriod = classWomenMatch ? classWomenMatch[1].trim() : null;
    const ageClassPeriod = ageClassPeriodMatch ? ageClassPeriodMatch[1].trim() : null;

    if (elo !== null) {
      history.push({
        rankingDate,
        elo,
        delta: delta > 0 ? `+${delta}` : String(delta),
        classification: classPeriod || classification,
        classificationMen: classMenPeriod || null,
        classificationWomen: classWomenPeriod || null,
        rankMen,
        rankWomen,
        rankTotal,
        ageclass: ageClassPeriod || ageclass
      });
    }
  }

  history.sort((a, b) => {
    const [d1, m1, y1] = a.rankingDate.split('.').map(Number);
    const [d2, m2, y2] = b.rankingDate.split('.').map(Number);
    return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
  });

  return {
    licenceNr,
    name: playerName,
    club,
    classification,
    ageclass,
    url: rankingUrl,
    totalPeriods: history.length,
    history
  };
}

export async function fetchPlayerEloSinglePage(
  licenceNr: string | number,
  latestRankingDate: string,
  fallbackDate: string | null = null,
  player: any = {}
) {
  const cleanLic = String(licenceNr).trim();
  if (!cleanLic || cleanLic === '-' || cleanLic === 'null') {
    return { error: 'Invalid or empty license number' };
  }

  let rankingUrl: string | null = null;
  let lastError: string | null = null;

  // 1. Direct licence lookup on latest live ranking date
  try {
    const searchUrl = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/eloFilter?federation=${encodeURIComponent(CONFIG.fedNickname)}&rankingDate=${encodeURIComponent(latestRankingDate)}&licenceNr=${encodeURIComponent(cleanLic)}`;
    const searchRes = await webSession.fetchPage(searchUrl);
    if (searchRes.ok) {
      const linkMatch = searchRes.html.match(/href="([^"]*ranking=\d+[^"]*)"/i);
      if (linkMatch) {
        rankingUrl = linkMatch[1].replace(/&amp;/g, '&');
        if (!rankingUrl.startsWith('http')) {
          rankingUrl = `${CONFIG.webBaseUrl}${rankingUrl.startsWith('/') ? '' : '/'}${rankingUrl}`;
        }
      }
    } else {
      lastError = `Search failed with HTTP ${searchRes.status}`;
    }
  } catch (err: any) {
    lastError = `Search network error: ${err.message}`;
  }

  // 2. Fallback: Extract direct permanent ranking link from playerPortrait
  if (!rankingUrl && player.nuLigaPersonId) {
    try {
      const portraitUrl = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/playerPortrait?federation=${encodeURIComponent(CONFIG.fedNickname)}&person=${encodeURIComponent(player.nuLigaPersonId)}`;
      const portraitRes = await webSession.fetchPage(portraitUrl);
      if (portraitRes.ok) {
        const portMatch = portraitRes.html.match(/href="([^"]*ranking=\d+[^"]*)"/i);
        if (portMatch) {
          rankingUrl = portMatch[1].replace(/&amp;/g, '&');
          if (!rankingUrl.startsWith('http')) {
            rankingUrl = `${CONFIG.webBaseUrl}${rankingUrl.startsWith('/') ? '' : '/'}${rankingUrl}`;
          }
        }
      } else {
        lastError = `Portrait failed with HTTP ${portraitRes.status}`;
      }
    } catch (err: any) {
      lastError = `Portrait network error: ${err.message}`;
    }
  }

  // 3. Fallback: Search across Historical Era Anchor Dates (for inactive historical players)
  if (!rankingUrl) {
    const historicalDates = [fallbackDate, '10.05.2024', '10.05.2022', '10.05.2018', '10.08.2014'].filter(Boolean) as string[];
    for (const d of historicalDates) {
      if (d === latestRankingDate) continue;
      try {
        const histUrl = `${CONFIG.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/eloFilter?federation=${encodeURIComponent(CONFIG.fedNickname)}&rankingDate=${encodeURIComponent(d)}&licenceNr=${encodeURIComponent(cleanLic)}`;
        const histRes = await webSession.fetchPage(histUrl);
        if (histRes.ok) {
          const match = histRes.html.match(/href="([^"]*ranking=\d+[^"]*)"/i);
          if (match) {
            rankingUrl = match[1].replace(/&amp;/g, '&');
            if (!rankingUrl.startsWith('http')) {
              rankingUrl = `${CONFIG.webBaseUrl}${rankingUrl.startsWith('/') ? '' : '/'}${rankingUrl}`;
            }
            break;
          }
        }
      } catch (err: any) {
        lastError = `Historical search (${d}) error: ${err.message}`;
      }
    }
  }

  if (!rankingUrl) {
    if (lastError && (lastError.includes('HTTP 5') || lastError.includes('HTTP 429') || lastError.includes('network error'))) {
      return { isNetworkError: true, error: lastError };
    }
    return {
      noHistory: true,
      error: 'No ranking URL found (0 rated matches in Click-TT)'
    };
  }

  // 4. Fetch Full Historical Elo Timeline (with retry on large HTML pages)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const detailRes = await webSession.fetchPage(rankingUrl);
      if (detailRes.ok) {
        const parsed = parseSinglePageElo(detailRes.html, cleanLic, rankingUrl);
        if (parsed && parsed.history.length > 0) {
          if (!parsed.name && player.fullName) parsed.name = player.fullName;
          return parsed;
        } else {
          return {
            noHistory: true,
            error: 'Detail page returned 0 evaluation periods'
          };
        }
      } else {
        lastError = `Detail page HTTP ${detailRes.status} from ${rankingUrl}`;
      }
    } catch (err: any) {
      lastError = `Detail fetch error (attempt ${attempt}): ${err.message}`;
      if (attempt < 3) await delay(300 * attempt);
    }
  }

  return { isNetworkError: true, error: lastError || 'Failed to fetch Elo detail page' };
}

export async function scrapeAllPlayersElo(options: {
  forceFresh?: boolean;
  limit?: number;
  concurrency?: number;
  bypassCache?: boolean;
} = {}) {
  console.log('📈 [Elo Scraper] Starting fast player Elo history extraction...');
  await webSession.login();

  const availableDates = await fetchAvailableRankingDates();
  if (availableDates.length === 0) {
    console.warn('⚠️ No ranking dates available from Click-TT.');
    return 0;
  }

  const latestLiveDate = availableDates[availableDates.length - 1];
  const fallbackDate = availableDates.find((d) => d === '10.05.2024') || availableDates[Math.max(0, availableDates.length - 24)];
  console.log(`📅 Ranking Dates: Latest="${latestLiveDate}", Fallback="${fallbackDate}".`);

  const completedSet = options.forceFresh ? new Set<string>() : await stateManager.getSet('player_elo');

  // Stream read players and deduplicate by licenceNr
  const targetPlayersMap = new Map<string, any>();
  for await (const p of storageManager.streamRecords('players')) {
    const lic = String(p.licenceNr || '').trim();
    if (lic && (!completedSet.has(lic) || options.forceFresh)) {
      targetPlayersMap.set(lic, { ...(targetPlayersMap.get(lic) || {}), ...p });
    }
  }

  const targetPlayers = Array.from(targetPlayersMap.values());
  const limit = options.limit || targetPlayers.length;
  const processList = targetPlayers.slice(0, limit);
  const concurrency = options.concurrency || Math.min(CONFIG.concurrency || 15, 15);

  console.log(`🎯 [Elo Scraper] Scraping Elo timelines for ${processList.length} players (Concurrency: ${concurrency} workers)...`);

  let processed = 0;
  let success = 0;
  let currentIndex = 0;
  const t0 = Date.now();

  async function worker() {
    while (currentIndex < processList.length) {
      const idx = currentIndex++;
      const p = processList[idx];
      const lic = String(p.licenceNr);

      try {
        const res: any = await fetchPlayerEloSinglePage(lic, latestLiveDate, fallbackDate, p);

        // Case 1: Full History Found
        if (res && res.history && res.history.length > 0 && res.url) {
          await storageManager.appendRecord('player_histories', res);
          await stateManager.markCompleted('player_elo', lic);
          success++;

          // Also enrich player record in players entity with latest ratings, dual classifications & eloHistoryUrl
          const latestPeriod = res.history[res.history.length - 1];
          if (latestPeriod) {
            const playerUpdate = {
              licenceNr: lic,
              eloHistoryUrl: res.url || null,
              currentElo: latestPeriod.elo ?? p.currentElo ?? null,
              currentClassification: latestPeriod.classification || res.classification || p.currentClassification || null,
              currentClassificationMen: latestPeriod.classificationMen || p.currentClassificationMen || null,
              currentClassificationWomen: latestPeriod.classificationWomen || p.currentClassificationWomen || null,
              currentRank: latestPeriod.rankTotal ?? p.currentRank ?? null,
              currentRankMen: latestPeriod.rankMen ?? p.currentRankMen ?? null,
              currentRankWomen: latestPeriod.rankWomen ?? p.currentRankWomen ?? null
            };
            await storageManager.appendRecord('players', playerUpdate);
          }
        }
        // Case 2: Player legitimately has no history (0 rated matches / 0 periods)
        else if (res && res.noHistory) {
          const emptyRecord = {
            licenceNr: lic,
            name: p.fullName || 'Player',
            club: p.clubName || null,
            classification: p.currentClassification || 'D1',
            ageclass: p.ageclass || null,
            url: null,
            totalPeriods: 0,
            history: []
          };
          await storageManager.appendRecord('player_histories', emptyRecord);
          await stateManager.markCompleted('player_elo', lic);
          success++;

          const playerUpdate = {
            licenceNr: lic,
            eloHistoryUrl: null
          };
          await storageManager.appendRecord('players', playerUpdate);
        }
        // Case 3: Transient Network/Server Error -> Log and do NOT mark completed (will be retried)
        else {
          const reason = res?.error || 'Unknown network error';
          console.log(`\x1b[2K\r❌ [${lic}] ${p.fullName || 'Player'} (${p.clubName || 'No Club'}): ${reason}`);
        }
      } catch (err: any) {
        console.log(`\x1b[2K\r❌ [${lic}] ${p.fullName || 'Player'} (${p.clubName || 'No Club'}): Exception: ${err.message}`);
      }

      processed++;
      if (processed % 10 === 0 || processed === processList.length) {
        const elapsedSec = (Date.now() - t0) / 1000 || 1;
        const rate = Math.round(processed / elapsedSec);
        const pct = Math.round((processed / processList.length) * 100);
        const remaining = processList.length - processed;
        const etaSec = rate > 0 ? Math.round(remaining / rate) : 0;
        const etaStr = etaSec > 60 ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s` : `${etaSec}s`;

        const barLen = 20;
        const filled = Math.min(barLen, Math.floor((processed / processList.length) * barLen));
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        process.stdout.write(`\r   ↳ [${bar}] ${pct}% | ${processed}/${processList.length} players (${rate} req/s, ETA: ${etaStr}) | Saved: ${success} `);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');

  await stateManager.saveMeta({ lastEloRankingDate: latestLiveDate });
  console.log(`✅ [Elo Scraper] Completed (${success} player timelines recorded with all historic matches).`);
  return success;
}

