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
    CompetitionType,
    CompetitionStatus,
    GenderRestriction,
} from '@prisma/client';

export interface ClickTTImportOptions {
    dataPath?: string;
    dryRun?: boolean;
    batchSize?: number;
    importLicenses?: boolean;
    importCompetitions?: boolean;
    importSeasons?: boolean;
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
    seasonsProcessed: number;
    clubsProcessed: number;
    clubsSkippedFakeTCard: number;
    competitionsProcessed: number;
    categoriesProcessed: number;
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

const REGION_CODE_TO_ASSOC_CODE: Record<string, string> = {
    'CH': 'STTF',
    'CH.01': 'AGTT',
    'CH.02': 'ANJTT',
    'CH.03': 'ATTT',
    'CH.04': 'AVVF',
    'CH.05': 'MTTV',
    'CH.06': 'NWTTV',
    'CH.07': 'OTTV',
    'CH.08': 'TTVI',
};

const REGION_NAME_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
    { pattern: /\b(agtt|genev|genf)\b/i, code: 'AGTT' },
    { pattern: /\b(anjtt|neuch|jura)\b/i, code: 'ANJTT' },
    { pattern: /\b(attt|tessin|ticino)\b/i, code: 'ATTT' },
    { pattern: /\b(avvf|vaud|valais|wallis|fribourg|freiburg)\b/i, code: 'AVVF' },
    { pattern: /\b(mttv|mittelland|bern|biel)\b/i, code: 'MTTV' },
    { pattern: /\b(nwttv|nordwest|basel|solothurn|aargau)\b/i, code: 'NWTTV' },
    { pattern: /\b(ottv|ostschweiz|zürich|zurich|st\.?\s*gallen|graub|thurgau|schaffhausen)\b/i, code: 'OTTV' },
    { pattern: /\b(ttvi|innerschweiz|luzern|zug|schwyz|uri|unterwalden)\b/i, code: 'TTVI' },
    { pattern: /\b(stt|sttf|schweiz|suisse|svizzera|switzerland|national)\b/i, code: 'STTF' },
];

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
            seasons: fs.existsSync(path.join(dir, 'seasons.json')),
            championships: fs.existsSync(path.join(dir, 'championships.json')),
            groups: fs.existsSync(path.join(dir, 'groups.json')),
            tournaments:
                fs.existsSync(path.join(dir, 'tournaments_list.json')) ||
                fs.existsSync(path.join(dir, 'tournaments.json')),
            full: fs.existsSync(path.join(dir, 'swiss_table_tennis_full.json')),
        };

        return {
            available: files.clubs || files.players || files.full || files.seasons || files.championships,
            path: dir,
            files,
        };
    }

    /**
     * Helper to slugify text safely
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
     * Parse season code into standard years, name and nickname
     */
    private static parseSeasonCode(str?: string | null): { name: string; nickname: string; startYear: number; endYear: number } | null {
        if (!str) return null;
        const m = str.match(/(?:19|20)?(\d{2})\s*\/\s*(?:19|20)?(\d{2})/);
        if (m) {
            const y1 = parseInt(m[1], 10) < 50 ? 2000 + parseInt(m[1], 10) : 1900 + parseInt(m[1], 10);
            const y2 = parseInt(m[2], 10) < 50 ? 2000 + parseInt(m[2], 10) : 1900 + parseInt(m[2], 10);
            return {
                name: `${y1}/${(y2 % 100).toString().padStart(2, '0')}`,
                nickname: `${y1 % 100}/${y2 % 100}`,
                startYear: y1,
                endYear: y2,
            };
        }
        return null;
    }

    /**
     * Derive season years and name from a given date
     */
    private static getSeasonForDate(date: Date | string): { name: string; nickname: string; startYear: number; endYear: number } {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1..12
        const startYear = month >= 7 ? year : year - 1;
        const endYear = startYear + 1;
        return {
            name: `${startYear}/${(endYear % 100).toString().padStart(2, '0')}`,
            nickname: `${startYear % 100}/${endYear % 100}`,
            startYear,
            endYear,
        };
    }

    /**
     * Resolve association code from arbitrary region string or code
     */
    private static resolveAssocCode(regionString?: string | null): string {
        if (!regionString) return 'STTF';
        const trimmed = String(regionString).trim();

        if (REGION_CODE_TO_ASSOC_CODE[trimmed]) {
            return REGION_CODE_TO_ASSOC_CODE[trimmed];
        }

        if (REGION_MAPPING[trimmed]) {
            return REGION_MAPPING[trimmed].code;
        }

        for (const item of REGION_NAME_PATTERNS) {
            if (item.pattern.test(trimmed)) {
                return item.code;
            }
        }

        return 'STTF';
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
        const importSeasons = options.importSeasons !== false;
        const importCompetitions = options.importCompetitions !== false;
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
        let rawSeasons: any[] = [];
        let rawChampionshipsBySeason: Record<string, any[]> = {};
        let rawTournaments: any[] = [];
        let rawGroups: any[] = [];
        const portraitsByLicence = new Map<string, any>();
        const portraitsByPersonId = new Map<string, any>();

        // Load Clubs
        const clubsFile = path.join(dataDir, 'clubs_and_teams.json');
        if (fs.existsSync(clubsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(clubsFile, 'utf8'));
                rawClubs = Array.isArray(parsed) ? parsed : parsed.clubs || [];
                console.log(`✅ Loaded ${rawClubs.length} clubs from clubs_and_teams.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse clubs_and_teams.json: ${err.message}`);
                errors.push(`Clubs parse error: ${err.message}`);
            }
        }

        // Load Player Portraits
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
            try {
                const parsed = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
                rawPlayers = Array.isArray(parsed) ? parsed : parsed.players || [];
                console.log(`✅ Loaded ${rawPlayers.length} players from players.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse players.json: ${err.message}`);
                errors.push(`Players parse error: ${err.message}`);
            }
        }

        // Load Seasons
        const seasonsFile = path.join(dataDir, 'seasons.json');
        if (fs.existsSync(seasonsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(seasonsFile, 'utf8'));
                rawSeasons = Array.isArray(parsed) ? parsed : parsed.seasons || [];
                console.log(`✅ Loaded ${rawSeasons.length} seasons from seasons.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse seasons.json: ${err.message}`);
                errors.push(`Seasons parse error: ${err.message}`);
            }
        }

        // Load Championships
        const championshipsFile = path.join(dataDir, 'championships.json');
        if (fs.existsSync(championshipsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(championshipsFile, 'utf8'));
                rawChampionshipsBySeason = parsed.championshipsBySeason || (Array.isArray(parsed) ? {} : parsed);
                const totalChamps = Object.values(rawChampionshipsBySeason).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
                console.log(`✅ Loaded ${totalChamps} championships across ${Object.keys(rawChampionshipsBySeason).length} seasons from championships.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse championships.json: ${err.message}`);
                errors.push(`Championships parse error: ${err.message}`);
            }
        }

        // Load Groups (Divisions & Categories)
        const groupsFile = path.join(dataDir, 'groups.json');
        if (fs.existsSync(groupsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(groupsFile, 'utf8'));
                rawGroups = Array.isArray(parsed) ? parsed : parsed.groups || [];
                console.log(`✅ Loaded ${rawGroups.length} groups/divisions from groups.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse groups.json: ${err.message}`);
                errors.push(`Groups parse error: ${err.message}`);
            }
        }

        // Load Tournaments
        const tournamentsListFile = path.join(dataDir, 'tournaments_list.json');
        const tournamentsFile = path.join(dataDir, 'tournaments.json');
        if (fs.existsSync(tournamentsListFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(tournamentsListFile, 'utf8'));
                rawTournaments = Array.isArray(parsed) ? parsed : parsed.tournaments || [];
                console.log(`✅ Loaded ${rawTournaments.length} tournaments from tournaments_list.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse tournaments_list.json: ${err.message}`);
                errors.push(`Tournaments parse error: ${err.message}`);
            }
        } else if (fs.existsSync(tournamentsFile)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(tournamentsFile, 'utf8'));
                rawTournaments = Array.isArray(parsed) ? parsed : parsed.tournaments || [];
                console.log(`✅ Loaded ${rawTournaments.length} tournaments from tournaments.json`);
            } catch (err: any) {
                console.warn(`⚠️ Warning: Failed to parse tournaments.json: ${err.message}`);
                errors.push(`Tournaments parse error: ${err.message}`);
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 1: Ensure Associations & Hierarchy
        // ---------------------------------------------------------------------
        options.onProgress?.({
            stage: 'ASSOCIATIONS',
            current: 0,
            total: Object.keys(REGION_MAPPING).length,
            message: 'Syncing National & Regional Associations...',
        });
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
            assocByCode.set('CH', nationalAssoc);
            associationsProcessed++;

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
            const existingAssocs = await prisma.association.findMany();
            for (const a of existingAssocs) {
                assocByCode.set(a.code, a);
                assocByCode.set(a.name, a);
            }
            for (const [regionKey, meta] of Object.entries(REGION_MAPPING)) {
                if (!assocByCode.has(meta.code)) {
                    const mock = { id: `mock-${meta.code}`, code: meta.code, name: meta.name };
                    assocByCode.set(meta.code, mock);
                    assocByCode.set(regionKey, mock);
                }
            }
            nationalAssoc = assocByCode.get('STTF') || { id: 'mock-STTF', code: 'STTF', name: 'Swiss Table Tennis' };
            assocByCode.set('CH', nationalAssoc);
            associationsProcessed = Object.keys(REGION_MAPPING).length;
        }

        console.log(`✅ Processed ${associationsProcessed} Associations.`);

        // ---------------------------------------------------------------------
        // STAGE 2: Ingest Seasons for All Associations
        // ---------------------------------------------------------------------
        options.onProgress?.({
            stage: 'SEASONS',
            current: 0,
            total: 15,
            message: 'Syncing Sporting Seasons across associations...',
        });
        console.log('\n📅 Syncing Seasons for all federations...');

        let seasonsProcessed = 0;
        const seasonMap = new Map<string, any>(); // key: `${assocId}:${seasonKey}` => Season record
        const seasonsListByAssoc = new Map<string, any[]>(); // assocId => Season records array

        // Gather all season periods
        const discoveredSeasons = new Map<string, { name: string; nickname: string; startYear: number; endYear: number; isCurrent: boolean; startDate: Date; endDate: Date }>();

        // Default baseline Swiss TT seasons (2012/13 through 2026/27)
        for (let startYear = 2012; startYear <= 2026; startYear++) {
            const endYear = startYear + 1;
            const name = `${startYear}/${(endYear % 100).toString().padStart(2, '0')}`;
            const nickname = `${startYear % 100}/${endYear % 100}`;
            const isCurrent = startYear === 2026;
            discoveredSeasons.set(name, {
                name,
                nickname,
                startYear,
                endYear,
                isCurrent,
                startDate: new Date(Date.UTC(startYear, 6, 1, 0, 0, 0)), // July 1
                endDate: new Date(Date.UTC(endYear, 5, 30, 23, 59, 59)), // June 30
            });
        }

        // Enrich with seasons.json if available
        for (const s of rawSeasons) {
            const parsed = ClickTTImportService.parseSeasonCode(s.name || s.nickname);
            if (parsed) {
                const isCurrent = s.state === 'active' || parsed.startYear === 2026;
                const startDate = s.start ? new Date(s.start) : new Date(Date.UTC(parsed.startYear, 6, 1, 0, 0, 0));
                const endDate = s.end ? new Date(s.end) : new Date(Date.UTC(parsed.endYear, 5, 30, 23, 59, 59));
                discoveredSeasons.set(parsed.name, {
                    name: parsed.name,
                    nickname: parsed.nickname,
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                    isCurrent,
                    startDate,
                    endDate,
                });
            }
        }

        // Add seasons from championshipsBySeason keys
        for (const seasonKey of Object.keys(rawChampionshipsBySeason)) {
            const parsed = ClickTTImportService.parseSeasonCode(seasonKey);
            if (parsed && !discoveredSeasons.has(parsed.name)) {
                discoveredSeasons.set(parsed.name, {
                    name: parsed.name,
                    nickname: parsed.nickname,
                    startYear: parsed.startYear,
                    endYear: parsed.endYear,
                    isCurrent: parsed.startYear === 2026,
                    startDate: new Date(Date.UTC(parsed.startYear, 6, 1, 0, 0, 0)),
                    endDate: new Date(Date.UTC(parsed.endYear, 5, 30, 23, 59, 59)),
                });
            }
        }

        const distinctAssocs: any[] = [];
        const seenAssocIds = new Set<string>();
        for (const a of assocByCode.values()) {
            if (a?.id && !seenAssocIds.has(a.id)) {
                seenAssocIds.add(a.id);
                distinctAssocs.push(a);
            }
        }

        if (importSeasons) {
            for (const assoc of distinctAssocs) {
                const assocSeasons: any[] = [];
                for (const seasonMeta of discoveredSeasons.values()) {
                    if (!dryRun) {
                        try {
                            const existing = await prisma.season.findFirst({
                                where: {
                                    associationId: assoc.id,
                                    name: seasonMeta.name,
                                },
                            });

                            let seasonRecord: any;
                            if (existing) {
                                seasonRecord = await prisma.season.update({
                                    where: { id: existing.id },
                                    data: {
                                        startDate: seasonMeta.startDate,
                                        endDate: seasonMeta.endDate,
                                        isCurrent: seasonMeta.isCurrent,
                                    },
                                });
                            } else {
                                seasonRecord = await prisma.season.create({
                                    data: {
                                        associationId: assoc.id,
                                        name: seasonMeta.name,
                                        startDate: seasonMeta.startDate,
                                        endDate: seasonMeta.endDate,
                                        isCurrent: seasonMeta.isCurrent,
                                    },
                                });
                            }

                            assocSeasons.push(seasonRecord);
                            seasonMap.set(`${assoc.id}:${seasonMeta.name}`, seasonRecord);
                            seasonMap.set(`${assoc.id}:${seasonMeta.nickname}`, seasonRecord);
                            seasonMap.set(`${assoc.code}:${seasonMeta.name}`, seasonRecord);
                            seasonMap.set(`${assoc.code}:${seasonMeta.nickname}`, seasonRecord);
                            seasonsProcessed++;
                        } catch (err: any) {
                            errors.push(`Season ${seasonMeta.name} for ${assoc.code}: ${err.message}`);
                        }
                    } else {
                        const mockSeason = {
                            id: `mock-season-${assoc.code}-${seasonMeta.nickname}`,
                            associationId: assoc.id,
                            name: seasonMeta.name,
                            startDate: seasonMeta.startDate,
                            endDate: seasonMeta.endDate,
                            isCurrent: seasonMeta.isCurrent,
                        };
                        assocSeasons.push(mockSeason);
                        seasonMap.set(`${assoc.id}:${seasonMeta.name}`, mockSeason);
                        seasonMap.set(`${assoc.id}:${seasonMeta.nickname}`, mockSeason);
                        seasonMap.set(`${assoc.code}:${seasonMeta.name}`, mockSeason);
                        seasonMap.set(`${assoc.code}:${seasonMeta.nickname}`, mockSeason);
                        seasonsProcessed++;
                    }
                }
                seasonsListByAssoc.set(assoc.id, assocSeasons);
            }
        }

        console.log(`✅ Processed ${seasonsProcessed} Seasons across ${distinctAssocs.length} federations.`);

        // Helper to resolve season for an association and date or string
        const resolveSeason = (assocId: string, seasonStrOrDate?: any): any => {
            if (!seasonStrOrDate) {
                // Return current season
                return seasonMap.get(`${assocId}:2026/27`) || seasonsListByAssoc.get(assocId)?.find((s) => s.isCurrent) || null;
            }

            if (typeof seasonStrOrDate === 'string') {
                const parsed = ClickTTImportService.parseSeasonCode(seasonStrOrDate);
                if (parsed) {
                    const match =
                        seasonMap.get(`${assocId}:${parsed.name}`) ||
                        seasonMap.get(`${assocId}:${parsed.nickname}`);
                    if (match) return match;
                }
            }

            const date = new Date(seasonStrOrDate);
            if (!isNaN(date.getTime())) {
                const assocSeasons = seasonsListByAssoc.get(assocId) || [];
                for (const s of assocSeasons) {
                    if (date >= new Date(s.startDate) && date <= new Date(s.endDate)) {
                        return s;
                    }
                }
                const derived = ClickTTImportService.getSeasonForDate(date);
                return seasonMap.get(`${assocId}:${derived.name}`) || null;
            }

            return seasonsListByAssoc.get(assocId)?.find((s) => s.isCurrent) || null;
        };

        // ---------------------------------------------------------------------
        // STAGE 3: Upsert Real Clubs (Filter out fake T-Card clubs)
        // ---------------------------------------------------------------------
        options.onProgress?.({
            stage: 'CLUBS',
            current: 0,
            total: rawClubs.length,
            message: 'Processing and upserting real clubs...',
        });
        console.log('\n🏓 Processing Clubs (filtering fake ClickTT T-Card clubs)...');

        let clubsProcessed = 0;
        let clubsSkippedFakeTCard = 0;
        const clubMapByNr = new Map<string, any>();
        const clubMapByName = new Map<string, any>();

        for (let i = 0; i < rawClubs.length; i++) {
            const rawClub = rawClubs[i];
            const clubNr = String(rawClub.clubNr || '').trim();
            const clubName = String(rawClub.name || '').trim();

            const isFakeTCard =
                clubNr === '9999' ||
                clubNr === '10000' ||
                clubName.toLowerCase().includes('t-card') ||
                (rawClub.nickname && String(rawClub.nickname).toLowerCase().includes('t-card'));

            if (isFakeTCard) {
                clubsSkippedFakeTCard++;
                continue;
            }

            const regionName = rawClub.regionName || '';
            const assocCode = ClickTTImportService.resolveAssocCode(regionName);
            const assoc = assocByCode.get(assocCode) || nationalAssoc;

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
                    clubMapByName.set(clubName.toLowerCase(), clubRecord);
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
                const mock = { id: `mock-${clubNr}`, name: clubName, code: clubNr, associationId: assoc?.id };
                clubMapByNr.set(clubNr, mock);
                clubMapByName.set(clubName.toLowerCase(), mock);
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
        // STAGE 4: Ingest Competitions & Categories
        // ---------------------------------------------------------------------
        let competitionsProcessed = 0;
        let categoriesProcessed = 0;

        if (importCompetitions) {
            console.log('\n🏆 Ingesting Championships, Leagues, Cups, and Tournaments...');
            options.onProgress?.({
                stage: 'COMPETITIONS',
                current: 0,
                total: 100,
                message: 'Importing Championships, Leagues, Cups, and Tournaments...',
            });

            // Index groups by championship nickname for division/category mapping
            const groupsByChmpNickname = new Map<string, any[]>();
            for (const g of rawGroups) {
                const chmp = g.chmpNickname ? String(g.chmpNickname).trim() : '';
                if (chmp) {
                    if (!groupsByChmpNickname.has(chmp)) {
                        groupsByChmpNickname.set(chmp, []);
                    }
                    groupsByChmpNickname.get(chmp)!.push(g);
                }
            }

            // Track unique league per association per season: `${assocId}:${seasonId}`
            const assignedLeagues = new Set<string>();
            const usedCompetitionSlugs = new Set<string>();

            // --- 4A: Championships & Leagues & Cups ---
            for (const [seasonKey, champList] of Object.entries(rawChampionshipsBySeason)) {
                if (!Array.isArray(champList)) continue;

                for (const c of champList) {
                    const rawName = String(c.name || '').replace('${nationalligen}', 'Nationalligen').trim();
                    const nickname = String(c.nickname || '').trim();
                    const region = c.region || '';
                    const assocCode = ClickTTImportService.resolveAssocCode(region || nickname);
                    const assoc = assocByCode.get(assocCode) || nationalAssoc;

                    // Resolve season
                    const season = resolveSeason(assoc.id, c.seasonNickname || seasonKey || c.competitionStart);
                    const seasonId = season?.id || null;

                    // Determine Competition Type
                    let compType: CompetitionType = CompetitionType.LEAGUE;
                    if (seasonKey.startsWith('C ') || /\b(cup|coupe|coppa|pokal)\b/i.test(rawName) || /\bcup\b/i.test(nickname)) {
                        compType = CompetitionType.CUP;
                    } else if (seasonKey.startsWith('SJC ') || /\bjunior\s*challenge\b/i.test(rawName) || /\bsjc\b/i.test(nickname)) {
                        compType = CompetitionType.SEASON_TOURNAMENT;
                    } else if (seasonKey.startsWith('FL ') || /\b(friendship|freundschaft)\b/i.test(rawName) || /\bfl\b/i.test(nickname)) {
                        compType = CompetitionType.FRIENDLY;
                    } else {
                        // Regular Championship
                        compType = CompetitionType.LEAGUE;
                        // Enforce: only ONE league competition per association per season
                        const leagueKey = `${assoc.id}:${seasonId}`;
                        if (assignedLeagues.has(leagueKey)) {
                            // If this association already has a league this season, classify additional ones as SEASON_TOURNAMENT
                            compType = CompetitionType.SEASON_TOURNAMENT;
                        } else {
                            assignedLeagues.add(leagueKey);
                        }
                    }

                    // Generate deterministic slug
                    let compSlug = ClickTTImportService.slugify(nickname ? nickname : `${rawName}-${seasonKey}`);
                    if (usedCompetitionSlugs.has(compSlug)) {
                        compSlug = `${compSlug}-${ClickTTImportService.slugify(assoc.code)}`;
                    }
                    if (usedCompetitionSlugs.has(compSlug)) {
                        compSlug = `${compSlug}-${Math.floor(Math.random() * 10000)}`;
                    }
                    usedCompetitionSlugs.add(compSlug);

                    const startDate = c.competitionStart
                        ? new Date(c.competitionStart)
                        : season?.startDate || new Date('2026-08-01T00:00:00.000Z');
                    const endDate = c.competitionEnd
                        ? new Date(c.competitionEnd)
                        : season?.endDate || new Date('2027-06-30T23:59:59.000Z');

                    let status: CompetitionStatus = CompetitionStatus.APPROVED;
                    if (c.state === 'closed' || c.state === 'archive' || c.state === 'completed' || endDate < new Date()) {
                        status = CompetitionStatus.COMPLETED;
                    } else if (c.state === 'active') {
                        status = CompetitionStatus.IN_PROGRESS;
                    }

                    if (!dryRun) {
                        try {
                            const compRecord = await prisma.competition.upsert({
                                where: { slug: compSlug },
                                update: {
                                    name: rawName,
                                    type: compType,
                                    associationId: assoc.id,
                                    seasonId,
                                    startDate,
                                    endDate,
                                    status,
                                    isOfficial: true,
                                    countsForElo: true,
                                },
                                create: {
                                    name: rawName,
                                    slug: compSlug,
                                    type: compType,
                                    associationId: assoc.id,
                                    seasonId,
                                    startDate,
                                    endDate,
                                    status,
                                    isOfficial: true,
                                    countsForElo: true,
                                },
                            });
                            competitionsProcessed++;

                            // Ingest Categories from linked groups in groups.json
                            const matchingGroups = groupsByChmpNickname.get(nickname) || [];
                            const distinctCategories = new Set<string>();
                            for (const g of matchingGroups) {
                                const catName = (g.league || g.name || g.contest || '').trim();
                                if (catName) distinctCategories.add(catName);
                            }

                            for (const catName of distinctCategories) {
                                const isFemale = /\b(damen|dames|femmes|women|girls)\b/i.test(catName);
                                const isMale = /\b(herren|hommes|messieurs|men|boys)\b/i.test(catName);
                                const genderRestriction = isFemale
                                    ? GenderRestriction.FEMALE_ONLY
                                    : isMale
                                    ? GenderRestriction.MALE_ONLY
                                    : GenderRestriction.ANY;

                                await prisma.category.create({
                                    data: {
                                        competitionId: compRecord.id,
                                        name: catName,
                                        teamSize: compType === CompetitionType.LEAGUE ? 3 : 1,
                                        genderRestriction,
                                        roundsPerGroup: compType === CompetitionType.LEAGUE ? 2 : 1,
                                    },
                                });
                                categoriesProcessed++;
                            }
                        } catch (err: any) {
                            errors.push(`Championship ${rawName} (${compSlug}): ${err.message}`);
                        }
                    } else {
                        competitionsProcessed++;
                        const matchingGroups = groupsByChmpNickname.get(nickname) || [];
                        const distinctCategories = new Set<string>();
                        for (const g of matchingGroups) {
                            const catName = (g.league || g.name || g.contest || '').trim();
                            if (catName) distinctCategories.add(catName);
                        }
                        categoriesProcessed += distinctCategories.size;
                    }
                }
            }

            // --- 4B: Tournaments (tournaments_list.json / tournaments.json) ---
            for (const t of rawTournaments) {
                const tourName = String(t.name || 'Turnier').trim();
                const tourRegion = t.tournamentRegion || t.operatorRegion || '';
                const hostName = t.hostName || '';

                let assocCode = ClickTTImportService.resolveAssocCode(tourRegion);
                if (assocCode === 'STTF' && hostName) {
                    const hostClub = clubMapByName.get(hostName.toLowerCase());
                    if (hostClub && hostClub.associationId) {
                        const matched = distinctAssocs.find((a) => a.id === hostClub.associationId);
                        if (matched) assocCode = matched.code;
                    }
                }
                const assoc = assocByCode.get(assocCode) || nationalAssoc;

                const startDate = t.startDate ? new Date(t.startDate) : new Date();
                const endDate = t.endDate ? new Date(t.endDate) : startDate;

                const season = resolveSeason(assoc.id, startDate);
                const seasonId = season?.id || null;

                // Determine Competition Type
                let compType: CompetitionType = CompetitionType.TOURNAMENT;
                if (/\b(cup|coupe|coppa|pokal)\b/i.test(tourName)) {
                    compType = CompetitionType.CUP;
                } else if (/\b(rangliste|ranking|rlt|top\s*16|top\s*8|qualifikation|qualification)\b/i.test(tourName)) {
                    compType = CompetitionType.RANKING_TOURNAMENT;
                }

                // Determine Status
                let status: CompetitionStatus = CompetitionStatus.APPROVED;
                if (t.state === 'completed' || endDate < new Date()) {
                    status = CompetitionStatus.COMPLETED;
                } else if (t.state === 'active' || t.state === 'in_progress') {
                    status = CompetitionStatus.IN_PROGRESS;
                } else if (t.onlineRegistration && startDate > new Date()) {
                    status = CompetitionStatus.REGISTRATION_OPEN;
                }

                const tourId = String(t.tournamentId || t.tournamentNr || '').trim();
                let compSlug = ClickTTImportService.slugify(
                    tourId ? `${tourName}-${tourId}` : `${tourName}-${startDate.getFullYear()}`
                );
                if (usedCompetitionSlugs.has(compSlug)) {
                    compSlug = `${compSlug}-${ClickTTImportService.slugify(assoc.code)}`;
                }
                if (usedCompetitionSlugs.has(compSlug)) {
                    compSlug = `${compSlug}-${Math.floor(Math.random() * 10000)}`;
                }
                usedCompetitionSlugs.add(compSlug);

                const location = [t.locationName, t.locationCity, t.locationZIPCode]
                    .filter((s) => s && s !== 'Test')
                    .join(', ') || null;

                if (!dryRun) {
                    try {
                        const compRecord = await prisma.competition.upsert({
                            where: { slug: compSlug },
                            update: {
                                name: tourName,
                                type: compType,
                                associationId: assoc.id,
                                seasonId,
                                startDate,
                                endDate,
                                location,
                                status,
                                isOfficial: true,
                                countsForElo: Boolean(t.fedRankValuation !== false),
                            },
                            create: {
                                name: tourName,
                                slug: compSlug,
                                type: compType,
                                associationId: assoc.id,
                                seasonId,
                                startDate,
                                endDate,
                                location,
                                status,
                                isOfficial: true,
                                countsForElo: Boolean(t.fedRankValuation !== false),
                            },
                        });
                        competitionsProcessed++;

                        // Ingest Categories from competitionAbbr
                        const compAbbr = Array.isArray(t.competitionAbbr) ? t.competitionAbbr : [];
                        for (const cat of compAbbr) {
                            const catName = String(cat.name || '').trim();
                            if (!catName) continue;

                            const isDouble = /\b(doppel|double|mixed)\b/i.test(catName);
                            const isMixed = /\bmixed\b/i.test(catName);
                            const isFemale = /\b(damen|dames|femmes|women|girls)\b/i.test(catName);
                            const isMale = /\b(herren|hommes|messieurs|men|boys)\b/i.test(catName);

                            const genderRestriction = isMixed
                                ? GenderRestriction.MIXED
                                : isFemale
                                ? GenderRestriction.FEMALE_ONLY
                                : isMale
                                ? GenderRestriction.MALE_ONLY
                                : GenderRestriction.ANY;

                            const minElo = cat.fedRankFrom ? parseInt(cat.fedRankFrom, 10) : null;
                            const maxElo = cat.fedRankTo ? parseInt(cat.fedRankTo, 10) : null;

                            await prisma.category.create({
                                data: {
                                    competitionId: compRecord.id,
                                    name: catName,
                                    teamSize: isDouble ? 2 : 1,
                                    minElo: minElo && !isNaN(minElo) ? minElo : null,
                                    maxElo: maxElo && !isNaN(maxElo) ? maxElo : null,
                                    genderRestriction,
                                    roundsPerGroup: 1,
                                },
                            });
                            categoriesProcessed++;
                        }
                    } catch (err: any) {
                        errors.push(`Tournament ${tourName} (${compSlug}): ${err.message}`);
                    }
                } else {
                    competitionsProcessed++;
                    const compAbbr = Array.isArray(t.competitionAbbr) ? t.competitionAbbr : [];
                    categoriesProcessed += compAbbr.length;
                }
            }

            console.log(`✅ Competitions Ingested: ${competitionsProcessed} competitions, ${categoriesProcessed} categories.`);
        }

        // ---------------------------------------------------------------------
        // STAGE 5: Upsert Players / Users & Licenses (Special T-Card Handling)
        // ---------------------------------------------------------------------
        options.onProgress?.({
            stage: 'PLAYERS',
            current: 0,
            total: rawPlayers.length,
            message: 'Processing and importing players and licenses...',
        });
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

                        // Club Role (ONLY for real clubs, never for fake T-Card clubs)
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

                        // License Issuance
                        if (importLicenses && (targetAssoc || nationalAssoc)) {
                            const licenseType = isTCardPlayer
                                ? LicenseType.PLAYER_TCARD
                                : LicenseType.PLAYER_REGULAR;

                            const assocId = isTCardPlayer
                                ? nationalAssoc?.id || targetAssoc?.id
                                : targetAssoc?.id || nationalAssoc?.id;

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
        console.log(`   - Seasons: ${seasonsProcessed}`);
        console.log(`   - Real Clubs: ${clubsProcessed}`);
        console.log(`   - Skipped T-Card Fake Clubs: ${clubsSkippedFakeTCard}`);
        console.log(`   - Competitions: ${competitionsProcessed}`);
        console.log(`   - Categories/Divisions: ${categoriesProcessed}`);
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
            seasonsProcessed,
            clubsProcessed,
            clubsSkippedFakeTCard,
            competitionsProcessed,
            categoriesProcessed,
            playersProcessed,
            tcardPlayersProcessed,
            licensesCreated,
            errors,
        };
    }
}
