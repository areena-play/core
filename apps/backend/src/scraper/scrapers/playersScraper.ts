import { getScraperConfig } from '../config';
import { restClient } from '../clients/restClient';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';

export function parseBirthDate(isoStr: string | null | undefined): string | null {
    if (!isoStr) return null;
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return null;
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Zurich',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    } catch {
        return null;
    }
}

function isExcludedClub(name: string | null | undefined, excludedClubs: string[]): boolean {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();
    return excludedClubs.some((ex) => lower === ex.toLowerCase() || lower.includes(ex.toLowerCase()));
}

export async function scrapePlayersFromClubs(options: { bypassCache?: boolean; useApi?: boolean; onProgress?: (msg: string) => void } = {}) {
    const config = await getScraperConfig();
    const log = (msg: string) => {
        console.log(msg);
        options.onProgress?.(msg);
    };

    log('👥 [Players] Extracting registered players from club rosters...');

    const completedPlayers = await stateManager.getSet('players');
    let newPlayersCount = 0;

    // Scan API for all valid clubs
    const clubsData = await restClient.get(`/2014/federations/${config.fedNickname}/clubs?maxResults=1000`, {
        bypassCache: options.bypassCache,
    });
    const rawClubs = clubsData?.clubAbbr || clubsData?.clubs || (Array.isArray(clubsData) ? clubsData : []);

    let clubIdx = 0;
    for (const c of rawClubs) {
        const clubNr = String(c.clubNr || c.nr || '').trim();
        const clubName = c.name || c.clubName || '';
        if (!clubNr || isExcludedClub(clubName, config.excludedClubs)) continue;

        clubIdx++;
        try {
            const playersEndpoint = `/2014/federations/${config.fedNickname}/clubs/${clubNr}/players`;
            const pData = await restClient.get(playersEndpoint, { bypassCache: options.bypassCache });
            const pList = pData?.clubPlayer || pData?.players || (Array.isArray(pData) ? pData : []);

            for (const p of pList) {
                const licenceNr = String(p.licenceNr || p.playerId || '').trim();
                if (!licenceNr || licenceNr === '-' || licenceNr === 'null') continue;

                if (!completedPlayers.has(licenceNr)) {
                    const firstname = p.firstname || '';
                    const lastname = p.lastname || '';
                    const fullName = firstname && lastname ? `${lastname}, ${firstname}` : (p.name || `${lastname} ${firstname}`.trim());

                    const playerRecord = {
                        licenceNr,
                        personId: p.personId || p.nuLigaPersonId || null,
                        nuLigaPersonId: p.nuLigaPersonId || null,
                        firstname,
                        lastname,
                        fullName,
                        birthday: parseBirthDate(p.birthDate) || null,
                        birthYear: p.birthYear || p.birthyear || null,
                        gender: p.gender || null,
                        nationality: p.nationality || null,
                        clubNr,
                        clubName,
                        regionName: c.regionName || c.region || null,
                        currentClassification: p.fedRank ? String(p.fedRank) : null,
                        currentClassificationMen: null,
                        currentClassificationWomen: null,
                        currentElo: null,
                        currentRank: p.natRank ? parseInt(p.natRank, 10) : null,
                        currentRankMen: null,
                        currentRankWomen: null,
                        currentRankJunior: p.natRankJunior ? parseInt(p.natRankJunior, 10) : null,
                        currentRankSenior: p.natRankSenior ? parseInt(p.natRankSenior, 10) : null,
                    };

                    await storageManager.appendRecord('players', playerRecord);
                    await stateManager.markCompleted('players', licenceNr);
                    newPlayersCount++;
                }
            }
        } catch {}

        if (clubIdx % 15 === 0) {
            options.onProgress?.(`Scanned ${clubIdx} clubs (${newPlayersCount} new players found)`);
        }
    }

    log(`✅ [Players] Extracted ${newPlayersCount} new players from club rosters.`);
    return newPlayersCount;
}

export async function scrapePlayerDetails(options: { onProgress?: (msg: string) => void } = {}) {
    const log = (msg: string) => {
        console.log(msg);
        options.onProgress?.(msg);
    };

    log('👤 [Player Details] Enriching player profiles...');
    // Players are enriched during roster and Elo scraping
    return;
}
