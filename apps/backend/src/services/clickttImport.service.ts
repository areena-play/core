import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import {
    AssociationLevel,
    LicenseType,
    LicenseStatus,
    LicenseScope,
    Gender,
    UserAccountStatus,
} from '@prisma/client';

export interface ClickTTImportOptions {
    dataPath?: string;
    dryRun?: boolean;
    batchSize?: number;
    importLicenses?: boolean;
    onProgress?: (progress: {
        stage: string;
        current: number;
        total: number;
        message: string;
    }) => void;
}

export interface ClickTTImportResult {
    success: boolean;
    dryRun: boolean;
    durationMs: number;
    associationsProcessed: number;
    clubsProcessed: number;
    clubsSkippedFakeTCard: number;
    playersProcessed: number;
    tcardPlayersProcessed: number;
    licensesCreated: number;
    errors: string[];
}

const DEFAULT_DATA_PATH = 'C:\\Users\\DominicSonderegger\\Workspace\\clicktt-scraper\\clicktt_data';

const REGION_MAPPING: Record<string, { shortName: string; code: string; name: string; regionDigit: number }> = {
    'Association Genevoise de Tennis de Table': {
        shortName: 'AGTT',
        code: 'AGTT',
        name: 'Association Genevoise de Tennis de Table',
        regionDigit: 1,
    },
    'Association Neuchâteloise et Jurassienne de Tennis de Table': {
        shortName: 'ANJTT',
        code: 'ANJTT',
        name: 'Association Neuchâteloise et Jurassienne de Tennis de Table',
        regionDigit: 2,
    },
    'Associazione Ticinese Tennis Tavolo': {
        shortName: 'ATTT',
        code: 'ATTT',
        name: 'Associazione Ticinese Tennis Tavolo',
        regionDigit: 3,
    },
    'Association Vaud, Valais, Fribourg': {
        shortName: 'AVVF',
        code: 'AVVF',
        name: 'Association Vaud, Valais, Fribourg',
        regionDigit: 4,
    },
    'Mittelländischer Tischtennisverband': {
        shortName: 'MTTV',
        code: 'MTTV',
        name: 'Mittelländischer Tischtennisverband',
        regionDigit: 5,
    },
    'Nordwestschweizerischer Tischtennisverband': {
        shortName: 'NWTTV',
        code: 'NWTTV',
        name: 'Nordwestschweizerischer Tischtennisverband',
        regionDigit: 6,
    },
    'Ostschweizer Tischtennisverband': {
        shortName: 'OTTV',
        code: 'OTTV',
        name: 'Ostschweizer Tischtennisverband',
        regionDigit: 7,
    },
    'Tischtennisverband Innerschweiz': {
        shortName: 'TTVI',
        code: 'TTVI',
        name: 'Tischtennisverband Innerschweiz',
        regionDigit: 8,
    },
    'Schweiz': {
        shortName: 'STTF',
        code: 'STTF',
        name: 'Swiss Table Tennis Federation',
        regionDigit: 0,
    },
};

export class ClickTTImportService {
    /**
     * Check if ClickTT dataset files are available and return summary metadata.
     */
    static checkDataset(customPath?: string) {
        const dir = customPath || DEFAULT_DATA_PATH;
        const exists = fs.existsSync(dir);
        if (!exists) {
            return {
                available: false,
                path: dir,
                files: {},
            };
        }

        const files = {
            clubs: fs.existsSync(path.join(dir, 'clubs_and_teams.json')),
            players: fs.existsSync(path.join(dir, 'players.json')),
            portraits: fs.existsSync(path.join(dir, 'player_portraits.json')),
            full: fs.existsSync(path.join(dir, 'swiss_table_tennis_full.json')),
        };

        return {
            available: files.clubs || files.players || files.full,
            path: dir,
            files,
        };
    }

    /**
     * Helper to slugify names
     */
    private static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Main import execution method.
     */
    static async importClickTTData(options: ClickTTImportOptions = {}): Promise<ClickTTImportResult> {
        const startTime = Date.now();
        const dataDir = options.dataPath || DEFAULT_DATA_PATH;
        const dryRun = Boolean(options.dryRun);
        const batchSize = options.batchSize || 250;
        const importLicenses = options.importLicenses !== false;
        const errors: string[] = [];

        console.log(`\n======================================================`);
        console.log(`🚀 Starting ClickTT Import (Dry Run: ${dryRun ? 'YES' : 'NO'})`);
        console.log(`📁 Source Directory: ${dataDir}`);
        console.log(`======================================================\n`);

        if (!fs.existsSync(dataDir)) {
            throw new Error(`ClickTT data directory does not exist at: ${dataDir}`);
        }

        // 1. Read files
        options.onProgress?.({ stage: 'READ_FILES', current: 0, total: 1, message: 'Reading ClickTT JSON data files...' });

        let rawClubs: any[] = [];
        let rawPlayers: any[] = [];
        const portraitsByLicence = new Map<string, any>();
        const portraitsByPersonId = new Map<string, any>();

        // Load Clubs
        const clubsFile = path.join(dataDir, 'clubs_and_teams.json');
        if (fs.existsSync(clubsFile)) {
            const parsed = JSON.parse(fs.readFileSync(clubsFile, 'utf8'));
            rawClubs = Array.isArray(parsed) ? parsed : parsed.clubs || [];
            console.log(`✅ Loaded ${rawClubs.length} clubs from clubs_and_teams.json`);
        }

        // Load Player Portraits (for accurate birth dates and rank details)
        const portraitsFile = path.join(dataDir, 'player_portraits.json');
        if (fs.existsSync(portraitsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(portraitsFile, 'utf8'));
                const portraitsList = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray(parsed.playerPortraits)
                    ? parsed.playerPortraits
                    : Object.values(parsed.playerPortraits || {});

                for (const p of portraitsList) {
                    if (p.licenceNr) portraitsByLicence.set(String(p.licenceNr).trim(), p);
                    if (p.internalId) portraitsByPersonId.set(String(p.internalId).trim(), p);
                    if (p.player?.licenceNr) portraitsByLicence.set(String(p.player.licenceNr).trim(), p);
                    if (p.player?.personId) portraitsByPersonId.set(String(p.player.personId).trim(), p);
                }
                console.log(`✅ Indexed ${portraitsList.length} player portraits for data enrichment`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse player_portraits.json: ${err.message}`);
                errors.push(`Portraits parse error: ${err.message}`);
            }
        }

        // Load Players
        const playersFile = path.join(dataDir, 'players.json');
        if (fs.existsSync(playersFile)) {
            const parsed = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
            rawPlayers = Array.isArray(parsed) ? parsed : parsed.players || [];
            console.log(`✅ Loaded ${rawPlayers.length} players from players.json`);
        }

        // ---------------------------------------------------------------------
        // STAGE 1: Ensure Associations & Hierarchy
        // ---------------------------------------------------------------------
        options.onProgress?.({ stage: 'ASSOCIATIONS', current: 0, total: Object.keys(REGION_MAPPING).length, message: 'Syncing National & Regional Associations...' });
        console.log('\n🏛️ Syncing Swiss Associations & Regional Federations...');

        const assocByCode = new Map<string, any>();
        let associationsProcessed = 0;

        // Upsert Top-Level National Federation first
        let nationalAssoc: any = null;
        if (!dryRun) {
            nationalAssoc = await prisma.association.findFirst({
                where: {
                    OR: [{ code: 'STTF' }, { shortName: 'STTF' }, { isTopLevel: true }],
                },
            });

            if (nationalAssoc) {
                nationalAssoc = await prisma.association.update({
                    where: { id: nationalAssoc.id },
                    data: {
                        name: 'Swiss Table Tennis Federation',
                        shortName: 'STTF',
                        level: AssociationLevel.NATIONAL,
                        isTopLevel: true,
                    },
                });
            } else {
                nationalAssoc = await prisma.association.create({
                    data: {
                        name: 'Swiss Table Tennis Federation',
                        shortName: 'STTF',
                        code: 'STTF',
                        slug: 'sttf',
                        level: AssociationLevel.NATIONAL,
                        isTopLevel: true,
                        licenseIdTemplate: '{regionDigit}{year2}{counter3}',
                        regionDigit: 0,
                        rules: {
                            maxForeignersPerTeam: 2,
                            allowTCardDualRegistration: true,
                            refresherCourseValidityMonths: 24,
                        },
                    },
                });
            }

            assocByCode.set('STTF', nationalAssoc);
            assocByCode.set('Schweiz', nationalAssoc);
            associationsProcessed++;

            // Ensure current active season exists for STTF
            const currentYear = new Date().getFullYear();
            const seasonName = `${currentYear}/${(currentYear + 1).toString().slice(-2)}`;
            let defaultSeason = await prisma.season.findFirst({
                where: { associationId: nationalAssoc.id, isCurrent: true },
            });
            if (!defaultSeason) {
                defaultSeason = await prisma.season.create({
                    data: {
                        associationId: nationalAssoc.id,
                        name: `Season ${seasonName}`,
                        startDate: new Date(`${currentYear}-08-01T00:00:00.000Z`),
                        endDate: new Date(`${currentYear + 1}-06-30T23:59:59.000Z`),
                        isCurrent: true,
                    },
                });
            }

            // Upsert 8 Regional Associations
            for (const [regionKey, meta] of Object.entries(REGION_MAPPING)) {
                if (meta.code === 'STTF') continue;

                let regAssoc = await prisma.association.findFirst({
                    where: {
                        OR: [
                            { code: meta.code },
                            { shortName: meta.shortName },
                            { slug: meta.code.toLowerCase() },
                        ],
                    },
                });

                if (regAssoc) {
                    regAssoc = await prisma.association.update({
                        where: { id: regAssoc.id },
                        data: {
                            name: meta.name,
                            shortName: meta.shortName,
                            level: AssociationLevel.REGIONAL,
                            regionDigit: meta.regionDigit,
                        },
                    });
                } else {
                    regAssoc = await prisma.association.create({
                        data: {
                            name: meta.name,
                            shortName: meta.shortName,
                            code: meta.code,
                            slug: meta.code.toLowerCase(),
                            level: AssociationLevel.REGIONAL,
                            isTopLevel: false,
                            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
                            regionDigit: meta.regionDigit,
                            rules: {
                                allowTCardDualRegistration: true,
                            },
                        },
                    });
                }

                assocByCode.set(meta.code, regAssoc);
                assocByCode.set(regionKey, regAssoc);
                associationsProcessed++;

                // Hierarchy link
                await prisma.associationHierarchy.upsert({
                    where: {
                        parentId_childId: {
                            parentId: nationalAssoc.id,
                            childId: regAssoc.id,
                        },
                    },
                    update: {},
                    create: {
                        parentId: nationalAssoc.id,
                        childId: regAssoc.id,
                    },
                });
            }
        } else {
            // In dry run, fetch existing associations or mock them
            const existingAssocs = await prisma.association.findMany();
            for (const a of existingAssocs) {
                assocByCode.set(a.code, a);
                assocByCode.set(a.name, a);
            }
            for (const [regionKey, meta] of Object.entries(REGION_MAPPING)) {
                if (!assocByCode.has(meta.code)) {
                    assocByCode.set(meta.code, { id: `mock-${meta.code}`, code: meta.code, name: meta.name });
                    assocByCode.set(regionKey, { id: `mock-${meta.code}`, code: meta.code, name: meta.name });
                }
            }
            associationsProcessed = Object.keys(REGION_MAPPING).length;
        }

        console.log(`✅ Processed ${associationsProcessed} Associations.`);

        // ---------------------------------------------------------------------
        // STAGE 2: Upsert Real Clubs (Filter out fake T-Card clubs)
        // ---------------------------------------------------------------------
        options.onProgress?.({ stage: 'CLUBS', current: 0, total: rawClubs.length, message: 'Processing and upserting real clubs...' });
        console.log('\n🏓 Processing Clubs (filtering fake ClickTT T-Card clubs)...');

        let clubsProcessed = 0;
        let clubsSkippedFakeTCard = 0;
        const clubMapByNr = new Map<string, any>();

        for (let i = 0; i < rawClubs.length; i++) {
            const rawClub = rawClubs[i];
            const clubNr = String(rawClub.clubNr || '').trim();
            const clubName = String(rawClub.name || '').trim();

            // Check if fake T-Card club
            const isFakeTCard =
                clubNr === '9999' ||
                clubNr === '10000' ||
                clubName.toLowerCase().includes('t-card') ||
                (rawClub.nickname && String(rawClub.nickname).toLowerCase().includes('t-card'));

            if (isFakeTCard) {
                clubsSkippedFakeTCard++;
                console.log(`  🚫 Skipped fake ClickTT placeholder club: "${clubName}" (#${clubNr})`);
                continue;
            }

            const regionName = rawClub.regionName || '';
            const assoc = assocByCode.get(regionName) || assocByCode.get('STTF');

            const slug = `${ClickTTImportService.slugify(clubName)}-${clubNr}`;
            const contact = rawClub.contactAddress || {};
            const city = contact.city || rawClub.city || 'Switzerland';
            const postalCode = contact.zip || '';
            const street = contact.street || '';
            const email = contact.emailHome || contact.emailWork || `info@${ClickTTImportService.slugify(clubName)}.ch`;
            const phone = contact.phoneMobile || contact.phoneHome || contact.phoneWork || '';
            const website = contact.www ? (contact.www.startsWith('http') ? contact.www : `https://${contact.www}`) : null;

            if (!dryRun) {
                try {
                    const clubRecord = await prisma.club.upsert({
                        where: { code: clubNr },
                        update: {
                            name: clubName,
                            slug,
                            city,
                            postalCode,
                            address: street,
                            email,
                            phone,
                            website,
                        },
                        create: {
                            name: clubName,
                            code: clubNr,
                            slug,
                            city,
                            postalCode,
                            address: street,
                            email,
                            phone,
                            website,
                            country: 'Switzerland',
                        },
                    });

                    clubMapByNr.set(clubNr, clubRecord);
                    clubsProcessed++;

                    // Link Club to its Regional Association
                    if (assoc) {
                        await prisma.clubAssociation.upsert({
                            where: {
                                clubId_associationId: {
                                    clubId: clubRecord.id,
                                    associationId: assoc.id,
                                },
                            },
                            update: {},
                            create: {
                                clubId: clubRecord.id,
                                associationId: assoc.id,
                            },
                        });
                    }
                } catch (err: any) {
                    console.error(`❌ Error upserting club ${clubName} (#${clubNr}):`, err.message);
                    errors.push(`Club #${clubNr} (${clubName}): ${err.message}`);
                }
            } else {
                clubMapByNr.set(clubNr, { id: `mock-${clubNr}`, name: clubName, code: clubNr });
                clubsProcessed++;
            }

            if ((i + 1) % 50 === 0 || i === rawClubs.length - 1) {
                options.onProgress?.({
                    stage: 'CLUBS',
                    current: i + 1,
                    total: rawClubs.length,
                    message: `Processed ${clubsProcessed} real clubs (${clubsSkippedFakeTCard} fake T-Card clubs filtered)...`,
                });
            }
        }

        console.log(`✅ Clubs Processed: ${clubsProcessed} real clubs created/updated. ${clubsSkippedFakeTCard} fake T-Card clubs bypassed.`);

        // ---------------------------------------------------------------------
        // STAGE 3: Upsert Players / Users & Licenses (Special T-Card Handling)
        // ---------------------------------------------------------------------
        options.onProgress?.({ stage: 'PLAYERS', current: 0, total: rawPlayers.length, message: 'Processing and importing players and licenses...' });
        console.log(`\n👥 Importing ${rawPlayers.length} Players & Issuing Licenses...`);

        let playersProcessed = 0;
        let tcardPlayersProcessed = 0;
        let licensesCreated = 0;

        // Determine active season
        let activeSeasonId: string | null = null;
        if (!dryRun && nationalAssoc) {
            const s = await prisma.season.findFirst({
                where: { associationId: nationalAssoc.id, isCurrent: true },
            });
            activeSeasonId = s?.id || null;
        }

        const validUntilDate = new Date(new Date().getFullYear() + 1, 5, 30, 23, 59, 59);
        const validFromDate = new Date(new Date().getFullYear(), 7, 1, 0, 0, 0);

        for (let i = 0; i < rawPlayers.length; i += batchSize) {
            const batch = rawPlayers.slice(i, i + batchSize);

            for (const p of batch) {
                const licenceNr = p.licenceNr ? String(p.licenceNr).trim() : null;
                const personId = p.personId ? String(p.personId).trim() : null;
                const firstname = (p.firstname || p.firstName || '').trim();
                const lastname = (p.lastname || p.lastName || '').trim();
                const clubNr = p.clubNr ? String(p.clubNr).trim() : '';

                if (!firstname && !lastname) continue;

                // Match with portrait for enriched birthDate / gender
                const portrait =
                    (licenceNr ? portraitsByLicence.get(licenceNr) : null) ||
                    (personId ? portraitsByPersonId.get(personId) : null);

                let birthDate: Date | null = null;
                if (portrait?.player?.birthDate) {
                    birthDate = new Date(portrait.player.birthDate);
                } else if (p.birthYear) {
                    birthDate = new Date(parseInt(p.birthYear, 10), 0, 1);
                }

                const genderRaw = (portrait?.player?.gender || p.gender || '').toLowerCase();
                const gender =
                    genderRaw === 'female' || genderRaw === 'f'
                        ? Gender.FEMALE
                        : genderRaw === 'male' || genderRaw === 'm'
                        ? Gender.MALE
                        : null;

                const fedRank = portrait?.player?.fedRank || p.fedRank || null;
                const rankNumber = typeof fedRank === 'number' ? fedRank : parseInt(fedRank, 10) || null;
                // Baseline ELO points approximation based on ranking
                const eloPoints = rankNumber ? Math.max(600, 1000 + (rankNumber - 1) * 75) : 1000;

                const isTCardPlayer =
                    clubNr === '9999' ||
                    clubNr === '10000' ||
                    (p.clubName && String(p.clubName).toLowerCase().includes('t-card'));

                const targetClub = !isTCardPlayer && clubNr ? clubMapByNr.get(clubNr) : null;
                const targetAssoc =
                    (p.regionName && assocByCode.get(p.regionName)) ||
                    (targetClub && assocByCode.get('STTF')) ||
                    nationalAssoc;

                if (!dryRun) {
                    try {
                        // Upsert User
                        // If player has license ID, use it as unique identifier; otherwise find by name
                        let userRecord: any = null;
                        if (licenceNr) {
                            userRecord = await prisma.user.upsert({
                                where: { licenseId: licenceNr },
                                update: {
                                    firstName: firstname,
                                    lastName: lastname,
                                    gender,
                                    birthDate,
                                    rank: rankNumber,
                                    eloPoints: eloPoints || undefined,
                                },
                                create: {
                                    licenseId: licenceNr,
                                    firstName: firstname,
                                    lastName: lastname,
                                    gender,
                                    birthDate,
                                    rank: rankNumber,
                                    eloPoints,
                                    accountStatus: UserAccountStatus.MANAGED,
                                    canLogin: false,
                                    email: null,
                                },
                            });
                        } else {
                            // Find existing or create
                            userRecord = await prisma.user.findFirst({
                                where: { firstName: firstname, lastName: lastname, birthDate },
                            });
                            if (!userRecord) {
                                userRecord = await prisma.user.create({
                                    data: {
                                        firstName: firstname,
                                        lastName: lastname,
                                        gender,
                                        birthDate,
                                        rank: rankNumber,
                                        eloPoints,
                                        accountStatus: UserAccountStatus.MANAGED,
                                        canLogin: false,
                                        email: null,
                                    },
                                });
                            }
                        }

                        playersProcessed++;
                        if (isTCardPlayer) {
                            tcardPlayersProcessed++;
                        }

                        // 1. Club Role (ONLY for real clubs, never for T-Card fake clubs)
                        if (targetClub && !isTCardPlayer) {
                            await prisma.userClubRole.upsert({
                                where: {
                                    userId_clubId_role: {
                                        userId: userRecord.id,
                                        clubId: targetClub.id,
                                        role: 'PLAYER',
                                    },
                                },
                                update: {},
                                create: {
                                    userId: userRecord.id,
                                    clubId: targetClub.id,
                                    role: 'PLAYER',
                                },
                            });
                        }

                        // 2. License Issuance
                        if (importLicenses && (targetAssoc || nationalAssoc)) {
                            const licenseType = isTCardPlayer
                                ? LicenseType.PLAYER_TCARD
                                : LicenseType.PLAYER_REGULAR;

                            const assocId = isTCardPlayer
                                ? nationalAssoc?.id || targetAssoc?.id
                                : targetAssoc?.id || nationalAssoc?.id;

                            // Check existing active license
                            const existingLic = await prisma.license.findFirst({
                                where: {
                                    userId: userRecord.id,
                                    type: licenseType,
                                    status: LicenseStatus.APPROVED,
                                },
                            });

                            if (!existingLic) {
                                await prisma.license.create({
                                    data: {
                                        userId: userRecord.id,
                                        type: licenseType,
                                        status: LicenseStatus.APPROVED,
                                        clubId: isTCardPlayer ? null : targetClub?.id || null,
                                        associationId: assocId,
                                        seasonId: activeSeasonId,
                                        scope: LicenseScope.ALL,
                                        validFrom: validFromDate,
                                        validUntil: validUntilDate,
                                        autoApproved: true,
                                        appliedByUserId: userRecord.id,
                                    },
                                });
                                licensesCreated++;
                            }
                        }
                    } catch (err: any) {
                        errors.push(`Player ${firstname} ${lastname} (#${licenceNr}): ${err.message}`);
                    }
                } else {
                    playersProcessed++;
                    if (isTCardPlayer) tcardPlayersProcessed++;
                    if (importLicenses) licensesCreated++;
                }
            }

            const currentCount = Math.min(i + batchSize, rawPlayers.length);
            options.onProgress?.({
                stage: 'PLAYERS',
                current: currentCount,
                total: rawPlayers.length,
                message: `Imported ${currentCount}/${rawPlayers.length} players (${tcardPlayersProcessed} T-Card players)...`,
            });
            console.log(`  ⏳ Imported ${currentCount}/${rawPlayers.length} players...`);
        }

        const durationMs = Date.now() - startTime;

        console.log(`\n======================================================`);
        console.log(`✨ ClickTT Import Completed in ${(durationMs / 1000).toFixed(2)}s`);
        console.log(`   - Associations: ${associationsProcessed}`);
        console.log(`   - Real Clubs: ${clubsProcessed}`);
        console.log(`   - Skipped T-Card Fake Clubs: ${clubsSkippedFakeTCard}`);
        console.log(`   - Players/Users Imported: ${playersProcessed}`);
        console.log(`   - T-Card Players (Direct Federation): ${tcardPlayersProcessed}`);
        console.log(`   - Licenses Issued: ${licensesCreated}`);
        console.log(`   - Errors encountered: ${errors.length}`);
        console.log(`======================================================\n`);

        return {
            success: errors.length === 0,
            dryRun,
            durationMs,
            associationsProcessed,
            clubsProcessed,
            clubsSkippedFakeTCard,
            playersProcessed,
            tcardPlayersProcessed,
            licensesCreated,
            errors,
        };
    }
}
