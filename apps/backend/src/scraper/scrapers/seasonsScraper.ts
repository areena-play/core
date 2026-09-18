import fs from 'fs/promises';
import { getScraperConfig } from '../config';
import { restClient } from '../clients/restClient';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';

export async function scrapeSeasons(options: { bypassCache?: boolean; onProgress?: (msg: string) => void } = {}) {
    const config = await getScraperConfig();
    const log = (msg: string) => {
        console.log(msg);
        options.onProgress?.(msg);
    };

    log('📅 [Seasons] Fetching all seasons...');
    const endpoint = `/2014/federations/${config.fedNickname}/seasons`;
    const rawData = await restClient.get(endpoint, { bypassCache: options.bypassCache });

    const rawList = rawData?.seasonAbbr || rawData?.seasons || (Array.isArray(rawData) ? rawData : []);
    if (rawList.length === 0) {
        log('⚠️ No seasons returned from API.');
        return [];
    }

    const now = new Date();
    const normalizedSeasons: any[] = [];

    for (let i = 0; i < rawList.length; i++) {
        const s = rawList[i];
        const nickname = s.nickname || s.name || '';
        if (!nickname) continue;

        const startDate = s.start || s.startDate || null;
        const endDate = s.end || s.endDate || null;
        const isActive =
            (s.state && s.state.toLowerCase() === 'active') ||
            (endDate && new Date(endDate) >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

        normalizedSeasons.push({
            seasonNickname: nickname,
            name: s.name || nickname,
            startDate,
            endDate,
            state: s.state || (isActive ? 'active' : 'inactive'),
            isActive: Boolean(isActive),
            isLatest: false,
        });
    }

    // Sort chronologically by start date / name
    normalizedSeasons.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    if (normalizedSeasons.length > 0) {
        normalizedSeasons[normalizedSeasons.length - 1].isLatest = true;
    }

    // Compact & save unique seasons
    const seenNicks = new Set<string>();
    const uniqueSeasons: any[] = [];
    for (const s of normalizedSeasons) {
        if (!seenNicks.has(s.seasonNickname)) {
            seenNicks.add(s.seasonNickname);
            uniqueSeasons.push(s);
        }
    }

    // Clear previous seasons.jsonl and write clean list
    const seasonsPath = await storageManager.getJsonlPath('seasons');
    await fs.writeFile(seasonsPath, uniqueSeasons.map((s) => JSON.stringify(s)).join('\n') + '\n', 'utf-8');

    for (const s of uniqueSeasons) {
        await stateManager.markCompleted('seasons', s.seasonNickname);
    }

    const latestSeason = uniqueSeasons[uniqueSeasons.length - 1]?.seasonNickname || null;
    await stateManager.saveMeta({ latestSeason, totalSeasons: uniqueSeasons.length });

    log(`✅ [Seasons] Loaded ${uniqueSeasons.length} seasons (Latest: "${latestSeason}").`);
    return uniqueSeasons;
}

