import fs from 'fs';
import readline from 'readline';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { getScraperConfig } from '../scraper/config';
import {
    AssociationLevel,
    LicenseType,
    LicenseStatus,
    LicenseScope,
    CompetitionType,
    CompetitionStatus,
    GenderRestriction,
    EncounterStatus,
    MatchType,
    MatchWinner,
    ParticipantSide,
    UserAccountStatus,
} from '@prisma/client';

// Regional associations definition
const REGIONAL_ASSOCIATIONS = [
    { code: 'AGTT', name: 'Association Genevoise de Tennis de Table', shortName: 'AGTT', regionDigit: 1 },
    { code: 'ANJTT', name: 'Association Neuchâteloise et Jurassienne de Tennis de Table', shortName: 'ANJTT', regionDigit: 2 },
    { code: 'ATTT', name: 'Associazione Ticinese Tennis Tavolo', shortName: 'ATTT', regionDigit: 3 },
    { code: 'AVVF', name: 'Association Vaud-Valais-Fribourg', shortName: 'AVVF', regionDigit: 4 },
    { code: 'MTTV', name: 'Mittelländischer Tischtennisverband', shortName: 'MTTV', regionDigit: 5 },
    { code: 'NWTTV', name: 'Nordwestschweizer Tischtennisverband', shortName: 'NWTTV', regionDigit: 6 },
    { code: 'OTTV', name: 'Ostschweizer Tischtennisverband', shortName: 'OTTV', regionDigit: 7 },
    { code: 'TTVI', name: 'Tischtennisverband Innerschweiz', shortName: 'TTVI', regionDigit: 8 },
];

export interface IngestionProgress {
    phase: string;
    processed: number;
    total?: number;
    message: string;
}

function parseSafeDate(val: any, fallback: Date = new Date()): Date {
    if (!val) return fallback;
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d;
}

export class ClickTTDbIngestionService {
    /**
     * Ensure STT National and Regional Associations exist in database
     */
    public static async ensureAssociations(): Promise<{ sttId: string; regionMap: Map<string, string> }> {
        // 1. STT Top Level
        let stt = await prisma.association.findFirst({
            where: { OR: [{ code: 'STT' }, { isTopLevel: true }] },
        });

        if (!stt) {
            stt = await prisma.association.create({
                data: {
                    name: 'Swiss Table Tennis',
                    shortName: 'STT',
                    code: 'STT',
                    slug: 'stt',
                    level: AssociationLevel.NATIONAL,
                    isTopLevel: true,
                    licenseIdTemplate: '{regionDigit}{year2}{counter3}',
                },
            });
        }

        const regionMap = new Map<string, string>();
        regionMap.set('STT', stt.id);

        // 2. Regional associations
        for (const reg of REGIONAL_ASSOCIATIONS) {
            let region = await prisma.association.findFirst({
                where: { code: reg.code },
            });

            if (!region) {
                region = await prisma.association.create({
                    data: {
                        name: reg.name,
                        shortName: reg.shortName,
                        code: reg.code,
                        slug: reg.code.toLowerCase(),
                        level: AssociationLevel.REGIONAL,
                        isTopLevel: false,
                        regionDigit: reg.regionDigit,
                    },
                });

                // Link to STT in hierarchy
                await prisma.associationHierarchy.upsert({
                    where: {
                        parentId_childId: {
                            parentId: stt.id,
                            childId: region.id,
                        },
                    },
                    update: {},
                    create: {
                        parentId: stt.id,
                        childId: region.id,
                    },
                });
            }

            regionMap.set(reg.code, region.id);
            regionMap.set(reg.name, region.id);
            regionMap.set(reg.shortName, region.id);
        }

        return { sttId: stt.id, regionMap };
    }

    /**
     * Ingest Clubs and ClubAssociation relations
     */
    public static async ingestClubs(
        clubs: any[],
        regionMap: Map<string, string>,
        sttId: string
    ): Promise<Map<string, string>> {
        const clubIdMap = new Map<string, string>();
        if (!Array.isArray(clubs) || clubs.length === 0) return clubIdMap;

        for (let i = 0; i < clubs.length; i += 500) {
            const chunk = clubs.slice(i, i + 500);
            for (const c of chunk) {
                const clubNr = c.clubNr || c.clubNumber || c.id;
                if (!clubNr) continue;

                const clubCode = String(clubNr).trim();
                const slug = `club-${clubCode}`;
                const name = c.name || c.clubName || `Club ${clubCode}`;

                const street = typeof c.address === 'object' ? c.address?.street : c.street;
                const zip = typeof c.address === 'object' ? c.address?.zip : c.zipCode || c.postalCode;
                const city = (typeof c.address === 'object' ? c.address?.city : c.city) || 'Unknown';
                const addressStr = street ? String(street) : (city ? `${city}, Switzerland` : 'Switzerland');
                const postalCodeStr = zip ? String(zip) : '0000';
                const emailStr = c.contactEmail || c.email || `info@club${clubCode}.ch`;
                const phoneStr = c.contactPhone || c.phone || '000 000 00 00';

                const club = await prisma.club.upsert({
                    where: { code: clubCode },
                    update: {
                        name,
                        slug,
                        website: c.website || null,
                        email: emailStr,
                        phone: phoneStr,
                        city,
                        address: addressStr,
                        postalCode: postalCodeStr,
                    },
                    create: {
                        name,
                        code: clubCode,
                        slug,
                        website: c.website || null,
                        email: emailStr,
                        phone: phoneStr,
                        city,
                        address: addressStr,
                        postalCode: postalCodeStr,
                    },
                });

                clubIdMap.set(clubCode, club.id);

                // Link to regional association or STT
                const assocCode = c.association || c.region || 'STT';
                const assocId = regionMap.get(assocCode) || sttId;

                await prisma.clubAssociation.upsert({
                    where: {
                        clubId_associationId: {
                            clubId: club.id,
                            associationId: assocId,
                        },
                    },
                    update: {},
                    create: {
                        clubId: club.id,
                        associationId: assocId,
                    },
                });
            }
        }

        return clubIdMap;
    }

    /**
     * Ingest Seasons into PostgreSQL
     */
    public static async ingestSeasons(seasons: any[], sttId: string): Promise<Map<string, string>> {
        const seasonIdMap = new Map<string, string>();
        if (!Array.isArray(seasons) || seasons.length === 0) return seasonIdMap;

        for (const s of seasons) {
            const nickname = s.seasonNickname || s.nickname || s.name;
            if (!nickname) continue;

            const name = s.name || `Season ${nickname}`;
            const startDate = parseSafeDate(s.startDate, new Date('2024-07-01'));
            const endDate = parseSafeDate(s.endDate, new Date('2025-06-30'));
            const isCurrent = Boolean(s.isCurrent || s.isLatest);

            let existing = await prisma.season.findFirst({
                where: { OR: [{ name }, { name: nickname }] },
            });

            if (!existing) {
                existing = await prisma.season.create({
                    data: {
                        name,
                        associationId: sttId,
                        startDate,
                        endDate,
                        isCurrent,
                    },
                });
            } else {
                existing = await prisma.season.update({
                    where: { id: existing.id },
                    data: {
                        startDate,
                        endDate,
                        isCurrent: isCurrent || existing.isCurrent,
                    },
                });
            }

            seasonIdMap.set(nickname, existing.id);
            seasonIdMap.set(name, existing.id);
        }

        return seasonIdMap;
    }

    /**
     * Ingest Players & License Roster into PostgreSQL
     */
    public static async ingestPlayers(
        players: any[],
        clubIdMap: Map<string, string>,
        seasonIdMap: Map<string, string>,
        sttId: string
    ): Promise<Map<string, string>> {
        const userIdMap = new Map<string, string>();
        if (!Array.isArray(players) || players.length === 0) return userIdMap;

        const dummyPasswordHash = await bcrypt.hash('Password123!', 10);
        const defaultSeasonId = Array.from(seasonIdMap.values())[0] || null;

        for (let i = 0; i < players.length; i += 500) {
            const chunk = players.slice(i, i + 500);

            for (const p of chunk) {
                const licenceNr = p.licenceNr || p.licenseId || p.playerId;
                if (!licenceNr) continue;

                const licenseId = String(licenceNr).trim();
                const firstName = p.firstname || p.firstName || 'Athlete';
                const lastName = p.lastname || p.lastName || `#${licenseId}`;
                const gender = p.gender === 'female' || p.gender === 'FEMALE' ? 'FEMALE' : 'MALE';
                const birthDate = p.birthday ? parseSafeDate(p.birthday, undefined) : p.birthYear ? parseSafeDate(`${p.birthYear}-01-01`, undefined) : null;
                const eloPoints = p.currentElo ? parseInt(p.currentElo, 10) : 1000;
                const currentLevel = p.currentClassification || p.currentClassificationMen || p.currentClassificationWomen || 'D1';
                const rank = p.currentRank ? parseInt(p.currentRank, 10) : null;

                const user = await prisma.user.upsert({
                    where: { licenseId },
                    update: {
                        firstName,
                        lastName,
                        birthDate,
                        gender,
                        playingGender: gender,
                        eloPoints: isNaN(eloPoints) ? 1000 : eloPoints,
                        currentLevel,
                        rank: rank && !isNaN(rank) ? rank : null,
                    },
                    create: {
                        licenseId,
                        firstName,
                        lastName,
                        birthDate,
                        gender,
                        playingGender: gender,
                        eloPoints: isNaN(eloPoints) ? 1000 : eloPoints,
                        currentLevel,
                        rank: rank && !isNaN(rank) ? rank : null,
                        accountStatus: UserAccountStatus.MANAGED,
                        canLogin: true,
                        passwordHash: dummyPasswordHash,
                    },
                });

                userIdMap.set(licenseId, user.id);

                // Upsert License
                const clubId = p.clubNr ? clubIdMap.get(String(p.clubNr)) : null;
                const isTCard = /t-card/i.test(p.clubName || '');

                const existingLicense = await prisma.license.findFirst({
                    where: { userId: user.id },
                });

                if (!existingLicense) {
                    await prisma.license.create({
                        data: {
                            userId: user.id,
                            type: isTCard ? LicenseType.PLAYER_TCARD : LicenseType.PLAYER_REGULAR,
                            status: LicenseStatus.APPROVED,
                            scope: LicenseScope.ALL,
                            clubId,
                            associationId: sttId,
                            seasonId: defaultSeasonId,
                            validFrom: new Date('2024-07-01'),
                            validUntil: new Date('2025-06-30'),
                            autoApproved: true,
                            appliedByUserId: user.id,
                        },
                    });
                } else if (clubId && existingLicense.clubId !== clubId) {
                    await prisma.license.update({
                        where: { id: existingLicense.id },
                        data: { clubId },
                    });
                }
            }
        }

        return userIdMap;
    }

    /**
     * Ingest Competitions, Categories, Groups, and Teams in high-performance batches
     */
    public static async ingestCompetitionsHierarchy(
        competitions: any[],
        categories: any[],
        groups: any[],
        clubIdMap: Map<string, string>,
        seasonIdMap: Map<string, string>,
        sttId: string
    ): Promise<{
        compIdMap: Map<string, string>;
        catIdMap: Map<string, string>;
        groupIdMap: Map<string, string>;
        teamIdMap: Map<string, string>;
    }> {
        const compIdMap = new Map<string, string>();
        const catIdMap = new Map<string, string>();
        const groupIdMap = new Map<string, string>();
        const teamIdMap = new Map<string, string>();

        // 1. Competitions Batch
        const compRows: any[] = [];
        for (const c of competitions || []) {
            if (!c.competitionId || !c.name) continue;
            const rawId = String(c.competitionId);
            const slug = `comp-${rawId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const seasonId = c.seasonNickname ? seasonIdMap.get(c.seasonNickname) || null : null;
            const isCup = c.type === 'cup' || /cup|coupe/i.test(c.name);
            const isTourn = c.type === 'tournament' || /turnier|tournament/i.test(c.name);
            const type = isCup ? CompetitionType.CUP : isTourn ? CompetitionType.TOURNAMENT : CompetitionType.LEAGUE;
            const id = crypto.randomUUID();

            compRows.push({
                id,
                name: c.name,
                slug,
                type,
                associationId: sttId,
                seasonId,
                startDate: parseSafeDate(c.startDate, new Date('2024-07-01')),
                endDate: parseSafeDate(c.endDate, new Date('2025-06-30')),
                status: CompetitionStatus.COMPLETED,
                isOfficial: true,
                countsForElo: true,
            });

            compIdMap.set(rawId, id);
        }

        for (let i = 0; i < compRows.length; i += 500) {
            await prisma.competition.createMany({
                data: compRows.slice(i, i + 500),
                skipDuplicates: true,
            });
        }

        // If competitions already existed and IDs were retrieved
        const existingComps = await prisma.competition.findMany({ select: { id: true, slug: true } });
        const slugToId = new Map(existingComps.map((ec) => [ec.slug, ec.id]));
        for (const c of competitions || []) {
            if (!c.competitionId) continue;
            const rawId = String(c.competitionId);
            const slug = `comp-${rawId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const realId = slugToId.get(slug);
            if (realId) compIdMap.set(rawId, realId);
        }

        // 2. Categories Batch
        const catRows: any[] = [];
        for (const cat of categories || []) {
            if (!cat.categoryId || !cat.name) continue;
            const rawCatId = String(cat.categoryId);
            const parentCompId = cat.competitionId ? compIdMap.get(String(cat.competitionId)) : null;
            if (!parentCompId) continue;

            const id = crypto.randomUUID();
            catRows.push({
                id,
                competitionId: parentCompId,
                name: cat.name,
                teamSize: cat.teamSize || (/doppel/i.test(cat.name) ? 2 : 1),
                genderRestriction: GenderRestriction.ANY,
            });
            catIdMap.set(rawCatId, id);
        }

        for (let i = 0; i < catRows.length; i += 500) {
            await prisma.category.createMany({
                data: catRows.slice(i, i + 500),
                skipDuplicates: true,
            });
        }

        // 3. Groups & Teams Batch
        const groupRows: any[] = [];
        const teamRows: any[] = [];
        const standingsRows: any[] = [];

        for (const g of groups || []) {
            if (!g.groupId || !g.name) continue;
            const rawGroupId = String(g.groupId);
            const catId = g.categoryId ? catIdMap.get(String(g.categoryId)) : null;
            if (!catId) continue;

            const gId = crypto.randomUUID();
            groupRows.push({
                id: gId,
                categoryId: catId,
                name: g.name,
            });
            groupIdMap.set(rawGroupId, gId);

            for (const t of g.teams || []) {
                if (!t.teamName) continue;
                const rawTeamId = t.teamId ? String(t.teamId) : null;
                const clubId = t.clubNr ? clubIdMap.get(String(t.clubNr)) || null : null;
                const tId = crypto.randomUUID();

                teamRows.push({
                    id: tId,
                    categoryId: catId,
                    name: t.teamName,
                    clubId,
                });

                if (rawTeamId) teamIdMap.set(rawTeamId, tId);
                teamIdMap.set(`${catId}_${t.teamName.trim()}`, tId);

                standingsRows.push({
                    groupId: gId,
                    teamId: tId,
                    played: t.meetingsPlayed || 0,
                    won: t.ownPoints || 0,
                    lost: t.otherPoints || 0,
                    matchesWon: t.ownMatches || 0,
                    matchesLost: t.otherMatches || 0,
                    setsWon: t.ownSets || 0,
                    setsLost: t.otherSets || 0,
                });
            }
        }

        for (let i = 0; i < groupRows.length; i += 500) {
            await prisma.categoryGroup.createMany({
                data: groupRows.slice(i, i + 500),
                skipDuplicates: true,
            });
        }

        for (let i = 0; i < teamRows.length; i += 500) {
            await prisma.team.createMany({
                data: teamRows.slice(i, i + 500),
                skipDuplicates: true,
            });
        }

        for (let i = 0; i < standingsRows.length; i += 500) {
            await prisma.groupStanding.createMany({
                data: standingsRows.slice(i, i + 500),
                skipDuplicates: true,
            });
        }

        return { compIdMap, catIdMap, groupIdMap, teamIdMap };
    }

    /**
     * Stream records generator from JSONL / JSON file without holding everything in memory
     */
    public static async *streamEntityRecords(entityName: string): AsyncGenerator<any> {
        const config = await getScraperConfig();
        const jsonlPath = path.join(config.storageDir, `${entityName}.jsonl`);
        const jsonPath = path.join(config.dataDir, `${entityName}.json`);

        if (fs.existsSync(jsonlPath)) {
            const fileStream = fs.createReadStream(jsonlPath, { encoding: 'utf-8' });
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
            for await (const line of rl) {
                const trimmed = line.trim();
                if (trimmed) {
                    try {
                        yield JSON.parse(trimmed);
                    } catch {}
                }
            }
        } else if (fs.existsSync(jsonPath)) {
            const raw = await fs.promises.readFile(jsonPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    yield item;
                }
            }
        }
    }

    /**
     * Ingest Encounters, Matches, MatchParticipants, and TeamMembers with high-speed streaming
     */
    public static async ingestEncountersAndMatchesStreaming(
        encountersStream: AsyncGenerator<any>,
        matchesStream: AsyncGenerator<any>,
        catIdMap: Map<string, string>,
        groupIdMap: Map<string, string>,
        teamIdMap: Map<string, string>,
        userIdMap: Map<string, string>,
        clubIdMap: Map<string, string>,
        onProgress?: (msg: string) => void
    ): Promise<{ encountersCount: number; matchesCount: number }> {
        const encounterIdMap = new Map<string, string>();
        const encounterMetaMap = new Map<string, { homeTeamId: string; awayTeamId: string; categoryId: string; groupId: string | null }>();

        let encounterBatch: any[] = [];
        let encountersCount = 0;

        // 1. Process Encounters
        for await (const enc of encountersStream) {
            if (!enc || !enc.encounterId) continue;
            const rawEncId = String(enc.encounterId);
            const catId = enc.categoryId ? catIdMap.get(String(enc.categoryId)) : null;
            const groupId = enc.groupId ? groupIdMap.get(String(enc.groupId)) || null : null;
            if (!catId) continue;

            const homeTeamKey = enc.homeTeamId ? teamIdMap.get(String(enc.homeTeamId)) : null;
            const homeTeamNameKey = enc.homeTeamName ? teamIdMap.get(`${catId}_${enc.homeTeamName.trim()}`) : null;
            let homeTeamId = homeTeamKey || homeTeamNameKey;

            const awayTeamKey = enc.awayTeamId ? teamIdMap.get(String(enc.awayTeamId)) : null;
            const awayTeamNameKey = enc.awayTeamName ? teamIdMap.get(`${catId}_${enc.awayTeamName.trim()}`) : null;
            let awayTeamId = awayTeamKey || awayTeamNameKey;

            if (!homeTeamId) {
                homeTeamId = crypto.randomUUID();
                const clubId = enc.homeClubNr ? clubIdMap.get(String(enc.homeClubNr)) || null : null;
                await prisma.team.create({
                    data: { id: homeTeamId, categoryId: catId, name: enc.homeTeamName || `Home Team`, clubId },
                });
                if (enc.homeTeamId) teamIdMap.set(String(enc.homeTeamId), homeTeamId);
            }

            if (!awayTeamId) {
                awayTeamId = crypto.randomUUID();
                const clubId = enc.awayClubNr ? clubIdMap.get(String(enc.awayClubNr)) || null : null;
                await prisma.team.create({
                    data: { id: awayTeamId, categoryId: catId, name: enc.awayTeamName || `Away Team`, clubId },
                });
                if (enc.awayTeamId) teamIdMap.set(String(enc.awayTeamId), awayTeamId);
            }

            const encId = crypto.randomUUID();
            const scheduledAt = parseSafeDate(enc.scheduledDate || enc.scheduledAt, new Date());
            const homeScore = enc.homeMatches !== undefined ? parseInt(enc.homeMatches, 10) : enc.homePoints || 0;
            const awayScore = enc.awayMatches !== undefined ? parseInt(enc.awayMatches, 10) : enc.awayPoints || 0;
            const isFinished = enc.status === 'finished' || homeScore > 0 || awayScore > 0;

            encounterBatch.push({
                id: encId,
                categoryId: catId,
                groupId,
                homeTeamId,
                awayTeamId,
                scheduledAt,
                homeScore: isNaN(homeScore) ? 0 : homeScore,
                awayScore: isNaN(awayScore) ? 0 : awayScore,
                status: isFinished ? EncounterStatus.FINISHED : EncounterStatus.SCHEDULED,
                location: enc.location || null,
            });

            encounterIdMap.set(rawEncId, encId);
            encounterMetaMap.set(encId, { homeTeamId, awayTeamId, categoryId: catId, groupId });
            encountersCount++;

            if (encounterBatch.length >= 500) {
                await prisma.encounter.createMany({
                    data: encounterBatch,
                    skipDuplicates: true,
                });
                encounterBatch = [];
                if (onProgress && encountersCount % 5000 === 0) {
                    onProgress(`⚡ Ingested ${encountersCount.toLocaleString('de-CH')} encounters...`);
                }
            }
        }

        if (encounterBatch.length > 0) {
            await prisma.encounter.createMany({
                data: encounterBatch,
                skipDuplicates: true,
            });
            encounterBatch = [];
        }

        // 2. Process Matches & MatchParticipants & TeamMembers
        let matchBatch: any[] = [];
        let participantBatch: any[] = [];
        const teamMemberMap = new Map<string, { teamId: string; userId: string; role: string }>();
        let matchesCount = 0;

        for await (const m of matchesStream) {
            if (!m || !m.matchId) continue;
            const encounterId = m.encounterId ? encounterIdMap.get(String(m.encounterId)) || null : null;
            const meta = encounterId ? encounterMetaMap.get(encounterId) : null;
            const catId = m.categoryId ? catIdMap.get(String(m.categoryId)) || meta?.categoryId : meta?.categoryId;
            const groupId = m.groupId ? groupIdMap.get(String(m.groupId)) || meta?.groupId : meta?.groupId || null;

            if (!catId) continue;

            const matchId = crypto.randomUUID();
            const matchType = m.matchType === 'double' ? MatchType.DOUBLE : MatchType.SINGLE;
            const homeScore = m.setsHome !== undefined ? parseInt(m.setsHome, 10) : 0;
            const awayScore = m.setsGuest !== undefined ? parseInt(m.setsGuest, 10) : 0;

            let winner: MatchWinner = MatchWinner.PENDING;
            if (m.winner === 'home') winner = MatchWinner.HOME;
            else if (m.winner === 'guest') winner = MatchWinner.AWAY;
            else if (m.winner === 'draw') winner = MatchWinner.DRAW;

            const isFinished = homeScore > 0 || awayScore > 0 || winner !== MatchWinner.PENDING;

            matchBatch.push({
                id: matchId,
                categoryId: catId,
                groupId,
                encounterId,
                matchType,
                label: m.matchPosition || (matchType === MatchType.DOUBLE ? 'Doppel' : 'Einzel'),
                result: m.setsScore || (m.sets && m.sets.length > 0 ? m.sets.join(' ') : null),
                homeScore: isNaN(homeScore) ? 0 : homeScore,
                awayScore: isNaN(awayScore) ? 0 : awayScore,
                winner,
                status: isFinished ? EncounterStatus.FINISHED : EncounterStatus.SCHEDULED,
            });

            // Participants Helper
            const addParticipant = (player: any, side: ParticipantSide, pos: number) => {
                if (!player) return;
                const lic = player.licenceNr || player.playerId;
                if (!lic) return;
                const userId = userIdMap.get(String(lic).trim());
                if (!userId) return;

                const teamId = meta ? (side === ParticipantSide.HOME ? meta.homeTeamId : meta.awayTeamId) : null;

                participantBatch.push({
                    id: crypto.randomUUID(),
                    matchId,
                    userId,
                    side,
                    position: pos,
                    teamId,
                });

                if (teamId) {
                    const key = `${teamId}_${userId}`;
                    if (!teamMemberMap.has(key)) {
                        teamMemberMap.set(key, { teamId, userId, role: 'PLAYER' });
                    }
                }
            };

            // Home player(s)
            if (m.homePlayer1) addParticipant(m.homePlayer1, ParticipantSide.HOME, 1);
            else if (m.player1Licence) addParticipant({ licenceNr: m.player1Licence }, ParticipantSide.HOME, 1);

            if (m.homePlayer2) addParticipant(m.homePlayer2, ParticipantSide.HOME, 2);
            else if (m.player1PartnerLicence) addParticipant({ licenceNr: m.player1PartnerLicence }, ParticipantSide.HOME, 2);

            // Away player(s)
            if (m.guestPlayer1) addParticipant(m.guestPlayer1, ParticipantSide.AWAY, 1);
            else if (m.player2Licence) addParticipant({ licenceNr: m.player2Licence }, ParticipantSide.AWAY, 1);

            if (m.guestPlayer2) addParticipant(m.guestPlayer2, ParticipantSide.AWAY, 2);
            else if (m.player2PartnerLicence) addParticipant({ licenceNr: m.player2PartnerLicence }, ParticipantSide.AWAY, 2);

            matchesCount++;

            if (matchBatch.length >= 500) {
                await prisma.match.createMany({
                    data: matchBatch,
                    skipDuplicates: true,
                });
                matchBatch = [];
            }

            if (participantBatch.length >= 1000) {
                await prisma.matchParticipant.createMany({
                    data: participantBatch,
                    skipDuplicates: true,
                });
                participantBatch = [];
            }

            if (teamMemberMap.size >= 1000) {
                await prisma.teamMember.createMany({
                    data: Array.from(teamMemberMap.values()),
                    skipDuplicates: true,
                });
                teamMemberMap.clear();
            }

            if (onProgress && matchesCount % 25000 === 0) {
                onProgress(`🏓 Ingested ${matchesCount.toLocaleString('de-CH')} match cards & participants...`);
            }
        }

        // Flush remaining batches
        if (matchBatch.length > 0) {
            await prisma.match.createMany({ data: matchBatch, skipDuplicates: true });
        }
        if (participantBatch.length > 0) {
            await prisma.matchParticipant.createMany({ data: participantBatch, skipDuplicates: true });
        }
        if (teamMemberMap.size > 0) {
            await prisma.teamMember.createMany({ data: Array.from(teamMemberMap.values()), skipDuplicates: true });
        }

        return { encountersCount, matchesCount };
    }

    /**
     * Ingest Delta Sync Payload into PostgreSQL automatically
     */
    public static async ingestDelta(deltaPayload: any): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
        const counts: Record<string, number> = {
            clubs: 0,
            seasons: 0,
            players: 0,
            competitions: 0,
            categories: 0,
            groups: 0,
            encounters: 0,
            matches: 0,
        };

        if (!deltaPayload || !deltaPayload.data) {
            return { success: true, importedCounts: counts };
        }

        const data = deltaPayload.data;
        const total = deltaPayload.totalRecords || 0;
        if (total === 0) {
            return { success: true, importedCounts: counts };
        }

        console.log(`\n📥 [Database Ingestion] Ingesting delta sync payload into PostgreSQL (${total} records)...`);

        const { sttId, regionMap } = await this.ensureAssociations();

        // 1. Seasons
        const seasonIdMap = await this.ingestSeasons(data.seasons || [], sttId);
        counts.seasons = (data.seasons || []).length;

        // 2. Clubs
        const clubIdMap = await this.ingestClubs(data.clubs || [], regionMap, sttId);
        counts.clubs = (data.clubs || []).length;

        // 3. Players
        const userIdMap = await this.ingestPlayers(data.players || [], clubIdMap, seasonIdMap, sttId);
        counts.players = (data.players || []).length;

        // 4. Competitions Hierarchy
        const { compIdMap, catIdMap, groupIdMap, teamIdMap } = await this.ingestCompetitionsHierarchy(
            data.competitions || [],
            data.categories || [],
            data.groups || [],
            clubIdMap,
            seasonIdMap,
            sttId
        );

        counts.competitions = (data.competitions || []).length;
        counts.categories = (data.categories || []).length;
        counts.groups = (data.groups || []).length;

        // 5. Encounters and Matches
        async function* arrayToGenerator(arr: any[]) {
            for (const item of arr) yield item;
        }

        const result = await this.ingestEncountersAndMatchesStreaming(
            arrayToGenerator(data.encounters || []),
            arrayToGenerator(data.matches || []),
            catIdMap,
            groupIdMap,
            teamIdMap,
            userIdMap,
            clubIdMap
        );

        counts.encounters = result.encountersCount;
        counts.matches = result.matchesCount;

        console.log(`✅ [Database Ingestion] Delta successfully applied to PostgreSQL.`);
        return { success: true, importedCounts: counts };
    }

    /**
     * Delete All Existing Sports Records and Bulk-Load Full Normalized Datasets
     */
    public static async resetAndLoadFullDatasets(onProgress?: (p: IngestionProgress) => void): Promise<{ success: boolean; counts: Record<string, number> }> {
        const notify = (phase: string, processed: number, total: number | undefined, message: string) => {
            console.log(`[DB Bulk Ingest] ${message}`);
            if (onProgress) onProgress({ phase, processed, total, message });
        };

        notify('cleanup', 0, undefined, '🧹 Purging existing sports database records...');

        // 1. Purge existing data in strict dependency order (preserving SuperAdmin & Settings)
        await prisma.matchParticipant.deleteMany();
        await prisma.match.deleteMany();
        await prisma.groupStanding.deleteMany();
        await prisma.encounter.deleteMany();
        await prisma.teamMember.deleteMany();
        await prisma.team.deleteMany();
        await prisma.categoryGroup.deleteMany();
        await prisma.category.deleteMany();
        await prisma.competitionSpeakerCallout.deleteMany();
        await prisma.competitionUserRole.deleteMany();
        await prisma.competitionLocation.deleteMany();
        await prisma.competition.deleteMany();
        await prisma.courseAttendance.deleteMany();
        await prisma.refresherCourse.deleteMany();
        await prisma.ratingSnapshotHistory.deleteMany();
        await prisma.license.deleteMany();
        await prisma.season.deleteMany();
        await prisma.userAssociationRole.deleteMany();
        await prisma.userClubRole.deleteMany();
        await prisma.userRelationship.deleteMany();
        await prisma.pushSubscription.deleteMany();
        await prisma.clubAssociation.deleteMany();
        await prisma.locationClub.deleteMany();
        await prisma.club.deleteMany();
        await prisma.associationHierarchy.deleteMany();
        await prisma.associationSport.deleteMany();
        await prisma.association.deleteMany();

        // Delete all non-superadmin users
        await prisma.user.deleteMany({
            where: { isSuperAdmin: false },
        });

        notify('associations', 1, undefined, '🏛️ Initializing National and Regional Associations...');
        const { sttId, regionMap } = await this.ensureAssociations();

        const config = await getScraperConfig();
        const dataDir = config.dataDir;
        const counts: Record<string, number> = {};

        // Helper to load small-to-medium JSON files
        const loadJson = async (filename: string): Promise<any[]> => {
            const filePath = path.join(dataDir, filename);
            if (!fs.existsSync(filePath)) return [];
            try {
                const raw = await fs.promises.readFile(filePath, 'utf-8');
                return JSON.parse(raw);
            } catch {
                return [];
            }
        };

        // 2. Seasons
        notify('seasons', 0, undefined, '📅 Ingesting Seasons dataset...');
        const seasons = await loadJson('seasons.json');
        const seasonIdMap = await this.ingestSeasons(seasons, sttId);
        counts.seasons = seasons.length;

        // 3. Clubs
        notify('clubs', 0, undefined, '🏢 Ingesting Clubs dataset...');
        const clubs = await loadJson('clubs.json');
        const clubIdMap = await this.ingestClubs(clubs, regionMap, sttId);
        counts.clubs = clubs.length;

        // 4. Players
        notify('players', 0, undefined, '🏓 Ingesting Players dataset (User + License)...');
        const players = await loadJson('players.json');
        const userIdMap = await this.ingestPlayers(players, clubIdMap, seasonIdMap, sttId);
        counts.players = players.length;

        // 5. Competitions, Categories, Groups, Teams
        notify('competitions_hierarchy', 0, undefined, '🏆 Ingesting Competitions, Categories, Groups & Teams...');
        const competitions = await loadJson('competitions.json');
        const categories = await loadJson('categories.json');
        const groups = await loadJson('groups.json');

        const { compIdMap, catIdMap, groupIdMap, teamIdMap } = await this.ingestCompetitionsHierarchy(
            competitions,
            categories,
            groups,
            clubIdMap,
            seasonIdMap,
            sttId
        );

        counts.competitions = competitions.length;
        counts.categories = categories.length;
        counts.groups = groups.length;

        // 6. Encounters & Matches Streaming (high speed, constant memory)
        notify('encounters_matches', 0, undefined, '⚔️ Streaming & Ingesting Encounters, Matches, Participants & Team Members...');
        const encountersStream = this.streamEntityRecords('encounters');
        const matchesStream = this.streamEntityRecords('matches');

        const { encountersCount, matchesCount } = await this.ingestEncountersAndMatchesStreaming(
            encountersStream,
            matchesStream,
            catIdMap,
            groupIdMap,
            teamIdMap,
            userIdMap,
            clubIdMap,
            (msg) => notify('streaming_progress', 0, undefined, msg)
        );

        counts.encounters = encountersCount;
        counts.matches = matchesCount;

        notify('done', 100, 100, `🎉 Full Database Reset & Ingestion completed! Ingested ${matchesCount.toLocaleString('de-CH')} matches, ${encountersCount.toLocaleString('de-CH')} encounters, ${counts.categories} categories, and ${counts.players} players.`);
        return { success: true, counts };
    }
}
