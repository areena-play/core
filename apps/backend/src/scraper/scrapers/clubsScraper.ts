import { getScraperConfig } from '../config';
import { restClient } from '../clients/restClient';
import { storageManager } from '../storageManager';
import { stateManager } from '../stateManager';

function isExcludedClub(name: string | null | undefined, excludedClubs: string[]): boolean {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();
    return excludedClubs.some((ex) => lower === ex.toLowerCase() || lower.includes(ex.toLowerCase()));
}

export async function scrapeClubs(options: { bypassCache?: boolean; onProgress?: (msg: string) => void } = {}) {
    const config = await getScraperConfig();
    const log = (msg: string) => {
        console.log(msg);
        options.onProgress?.(msg);
    };

    log('🏢 [Clubs] Fetching club list...');
    const endpoint = `/2014/federations/${config.fedNickname}/clubs?maxResults=1000`;
    const rawData = await restClient.get(endpoint, { bypassCache: options.bypassCache });
    const rawList = rawData?.clubAbbr || rawData?.clubs || (Array.isArray(rawData) ? rawData : []);

    if (rawList.length === 0) {
        log('⚠️ No clubs returned from API.');
        return [];
    }

    const validClubs = rawList.filter((c: any) => {
        const name = c.name || c.clubName || '';
        const nr = String(c.clubNr || c.nr || '').trim();
        return nr && !isExcludedClub(name, config.excludedClubs);
    });

    log(`🏢 [Clubs] Found ${validClubs.length} valid clubs (Excluded T-Card / invalid entries).`);

    const completedSet = await stateManager.getSet('clubs');
    const targetClubs = validClubs.filter((c: any) => !completedSet.has(String(c.clubNr || c.nr).trim()));

    log(`🏢 [Clubs] Processing ${targetClubs.length} remaining clubs (${completedSet.size} already completed)...`);

    const scrapedClubs: any[] = [];
    let processed = 0;

    for (const c of targetClubs) {
        const clubNr = String(c.clubNr || c.nr).trim();
        const baseName = c.name || c.clubName || '';

        const addr = c.contactAddress || c.address || {};
        const address = {
            street: addr.street || null,
            zip: addr.zip || null,
            city: addr.city || c.city || null,
        };

        const contactEmail = addr.emailHome || addr.emailWork || addr.email || c.email || null;
        const contactPhone = addr.phoneWork || addr.phoneMobile || addr.phoneHome || addr.phone || c.phone || null;
        const rawWebsite = addr.www || addr.website || addr.url || c.website || null;
        const website = rawWebsite ? (rawWebsite.startsWith('http') ? rawWebsite : `https://${rawWebsite}`) : null;

        const clubRecord = {
            clubNr,
            name: baseName,
            region: c.regionName || c.region || null,
            regionId: c.regionId || null,
            website,
            address,
            contactEmail,
            contactPhone,
            isActive: c.isActive !== undefined ? c.isActive : true,
        };

        await storageManager.appendRecord('clubs', clubRecord);
        await stateManager.markCompleted('clubs', clubNr);
        scrapedClubs.push(clubRecord);

        processed++;
        if (processed % 25 === 0 || processed === targetClubs.length) {
            options.onProgress?.(`Scraped clubs: [${processed}/${targetClubs.length}]`);
        }
    }

    log(`✅ [Clubs] All clubs processed successfully (${validClubs.length} total).`);
    return validClubs;
}

