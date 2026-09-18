import fs from 'fs';
import readline from 'readline';
import path from 'path';
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
            regionMap.set(reg.name.toLowerCase(), region.id);
        }

        return { sttId: stt.id, regionMap };
    }

    /**
     * Ingest Clubs into PostgreSQL
     */
    public static async ingestClubs(clubs: any[], regionMap: Map<string, string>, sttId: string): Promise<Map<string, string>> {
        const clubIdMap = new Map<string, string>();
        if (!Array.isArray(clubs) || clubs.length === 0) return clubIdMap;

        for (const c of clubs) {
            if (!c.clubNr || !c.name) continue;
            const code = String(c.clubNr).trim();
            const slug = `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${code}`;

            const club = await prisma.club.upsert({
                where: { code },
                update: {
                    name: c.name,
                    slug,
                    address: c.address?.street || '',
                    city: c.address?.city || '',
                    postalCode: c.address?.zip || '',
                    email: c.contactEmail || '',
                    phone: c.contactPhone || '',
                    website: c.website || null,
                },
                create: {
                    name: c.name,
                    code,
                    slug,
                    address: c.address?.street || '',
                    city: c.address?.city || '',
                    postalCode: c.address?.zip || '',
                    email: c.contactEmail || '',
                    phone: c.contactPhone || '',
                    website: c.website || null,
                },
            });

            clubIdMap.set(code, club.id);

            // Associate with region or STT
            const targetAssocId = (c.region && regionMap.get(c.region.toLowerCase())) || regionMap.get(c.region) || sttId;
            if (targetAssocId) {
                await prisma.clubAssociation.upsert({
                    where: {
                        clubId_associationId: {
                            clubId: club.id,
                            associationId: targetAssocId,
                        },
                    },
                    update: {},
                    create: {
                        clubId: club.id,
                        associationId: targetAssocId,
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
            const startDate = s.startDate ? new Date(s.startDate) : new Date('2024-07-01');
            const endDate = s.endDate ? new Date(s.endDate) : new Date('2025-06-30');
            const isCurrent = Boolean(s.isCurrent || s.isLatest || s.isActive);

            let existing = await prisma.season.findFirst({
                where: {
                    associationId: sttId,
                    name: { in: [name, nickname] },
                },
            });

            if (!existing) {
                existing = await prisma.season.create({
                    data: {
                        associationId: sttId,
                        name,
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

        for (const p of players) {
            const licenceNr = p.licenceNr || p.licenseId || p.playerId;
            if (!licenceNr) continue;

            const licenseId = String(licenceNr).trim();
            const firstName = p.firstname || p.firstName || 'Athlete';
            const lastName = p.lastname || p.lastName || `#${licenseId}`;
            const gender = p.gender === 'female' || p.gender === 'FEMALE' ? 'FEMALE' : 'MALE';
            const birthDate = p.birthday ? new Date(p.birthday) : p.birthYear ? new Date(`${p.birthYear}-01-01`) : null;
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
                    eloPoints,
                    currentLevel,
                    rank,
                },
                create: {
                    licenseId,
                    firstName,
                    lastName,
                    birthDate,
                    gender,
                    playingGender: gender,
                    eloPoints,
                    currentLevel,
                    rank,
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

        return userIdMap;
    }

    /**
     * Ingest Competitions, Categories, Groups, Teams, Encounters, Matches, and TeamMembers
     */
    public static async ingestCompetitionsAndEncounters(
        competitions: any[],
        categories: any[],
        groups: any[],
        encounters: any[],
        matches: any[],
        clubIdMap: Map<string, string>,
        seasonIdMap: Map<string, string>,
        userIdMap: Map<string, string>,
        sttId: string
    ) {
        const compIdMap = new Map<string, string>();
        const catIdMap = new Map<string, string>();
        const groupIdMap = new Map<string, string>();
        const teamIdMap = new Map<string, string>();

        // 1. Competitions
        for (const c of competitions || []) {
            if (!c.competitionId || !c.name) continue;
            const rawId = String(c.competitionId);
            const slug = `comp-${rawId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const seasonId = c.seasonNickname ? seasonIdMap.get(c.seasonNickname) || null : null;
            const isCup = c.type === 'cup' || /cup|coupe/i.test(c.name);
            const isTourn = c.type === 'tournament' || /turnier|tournament/i.test(c.name);
            const type = isCup ? CompetitionType.CUP : isTourn ? CompetitionType.TOURNAMENT : CompetitionType.LEAGUE;

            const comp = await prisma.competition.upsert({
                where: { slug },
                update: {
                    name: c.name,
                    type,
                    seasonId,
                    startDate: c.startDate ? new Date(c.startDate) : new Date('2024-07-01'),
                    endDate: c.endDate ? new Date(c.endDate) : new Date('2025-06-30'),
                    status: CompetitionStatus.COMPLETED,
                    isOfficial: true,
                    countsForElo: true,
                },
                create: {
                    name: c.name,
                    slug,
                    type,
                    associationId: sttId,
                    seasonId,
                    startDate: c.startDate ? new Date(c.startDate) : new Date('2024-07-01'),
                    endDate: c.endDate ? new Date(c.endDate) : new Date('2025-06-30'),
                    status: CompetitionStatus.COMPLETED,
                    isOfficial: true,
                    countsForElo: true,
                },
            });

            compIdMap.set(rawId, comp.id);
        }

        // 2. Categories
        for (const cat of categories || []) {
            if (!cat.categoryId || !cat.name) continue;
            const rawCatId = String(cat.categoryId);
            const parentCompId = cat.competitionId ? compIdMap.get(String(cat.competitionId)) : null;
            if (!parentCompId) continue;

            const existing = await prisma.category.findFirst({
                where: { competitionId: parentCompId, name: cat.name },
            });

            let categoryId = existing?.id;
            if (!existing) {
                const created = await prisma.category.create({
                    data: {
                        competitionId: parentCompId,
                        name: cat.name,
                        teamSize: cat.teamSize || (/doppel/i.test(cat.name) ? 2 : 1),
                        genderRestriction: GenderRestriction.ANY,
                    },
                });
                categoryId = created.id;
            }

            catIdMap.set(rawCatId, categoryId!);
        }

        // 3. Groups & Teams
        for (const g of groups || []) {
            if (!g.groupId || !g.name) continue;
            const rawGroupId = String(g.groupId);
            const catId = g.categoryId ? catIdMap.get(String(g.categoryId)) : null;
            if (!catId) continue;

            let group = await prisma.categoryGroup.findFirst({
                where: { categoryId: catId, name: g.name },
            });

            if (!group) {
                group = await prisma.categoryGroup.create({
                    data: {
                        categoryId: catId,
                        name: g.name,
                    },
                });
            }

            groupIdMap.set(rawGroupId, group.id);

            // Ingest Teams within this Group
            for (const t of g.teams || []) {
                if (!t.teamName) continue;
                const rawTeamId = t.teamId ? String(t.teamId) : null;
                const clubId = t.clubNr ? clubIdMap.get(String(t.clubNr)) || null : null;

                let team = await prisma.team.findFirst({
                    where: { categoryId: catId, name: t.teamName },
                });

                if (!team) {
                    team = await prisma.team.create({
                        data: {
                            categoryId: catId,
                            name: t.teamName,
                            clubId,
                        },
                    });
                }

                if (rawTeamId) {
                    teamIdMap.set(rawTeamId, team.id);
                }
                teamIdMap.set(`${catId}_${t.teamName.trim()}`, team.id);

                // Ingest Standings
                await prisma.groupStanding.upsert({
                    where: {
                        groupId_teamId: {
                            groupId: group.id,
                            teamId: team.id,
                        },
                    },
                    update: {
                        played: t.meetingsPlayed || 0,
                        won: t.ownPoints || 0,
                        lost: t.otherPoints || 0,
                        matchesWon: t.ownMatches || 0,
                        matchesLost: t.otherMatches || 0,
                        setsWon: t.ownSets || 0,
                        setsLost: t.otherSets || 0,
                    },
                    create: {
                        groupId: group.id,
                        teamId: team.id,
                        played: t.meetingsPlayed || 0,
                        won: t.ownPoints || 0,
                        lost: t.otherPoints || 0,
                        matchesWon: t.ownMatches || 0,
                        matchesLost: t.otherMatches || 0,
                        setsWon: t.ownSets || 0,
                        setsLost: t.otherSets || 0,
                    },
                });
            }
        }

        // 4. Encounters
        const encounterIdMap = new Map<string, string>();
        for (const enc of encounters || []) {
            if (!enc.encounterId) continue;
            const rawEncId = String(enc.encounterId);
            const catId = enc.categoryId ? catIdMap.get(String(enc.categoryId)) : null;
            const groupId = enc.groupId ? groupIdMap.get(String(enc.groupId)) || null : null;

            if (!catId) continue;

            // Find or create home & away teams
            const homeTeamKey = enc.homeTeamId ? teamIdMap.get(String(enc.homeTeamId)) : null;
            const homeTeamNameKey = enc.homeTeamName ? teamIdMap.get(`${catId}_${enc.homeTeamName.trim()}`) : null;
            let homeTeamId = homeTeamKey || homeTeamNameKey;

            const awayTeamKey = enc.awayTeamId ? teamIdMap.get(String(enc.awayTeamId)) : null;
            const awayTeamNameKey = enc.awayTeamName ? teamIdMap.get(`${catId}_${enc.awayTeamName.trim()}`) : null;
            let awayTeamId = awayTeamKey || awayTeamNameKey;

            if (!homeTeamId && enc.homeTeamName) {
                const clubId = enc.homeClubNr ? clubIdMap.get(String(enc.homeClubNr)) || null : null;
                const created = await prisma.team.create({
                    data: { categoryId: catId, name: enc.homeTeamName, clubId },
                });
                homeTeamId = created.id;
                if (enc.homeTeamId) teamIdMap.set(String(enc.homeTeamId), homeTeamId);
            }

            if (!awayTeamId && enc.awayTeamName) {
                const clubId = enc.awayClubNr ? clubIdMap.get(String(enc.awayClubNr)) || null : null;
                const created = await prisma.team.create({
                    data: { categoryId: catId, name: enc.awayTeamName, clubId },
                });
                awayTeamId = created.id;
                if (enc.awayTeamId) teamIdMap.set(String(enc.awayTeamId), awayTeamId);
            }

            if (!homeTeamId || !awayTeamId) continue;

            const scheduledAt = enc.scheduledDate ? new Date(enc.scheduledDate) : new Date();
            const homeScore = enc.homeMatches !== undefined ? parseInt(enc.homeMatches, 10) : enc.homePoints || 0;
            const awayScore = enc.awayMatches !== undefined ? parseInt(enc.awayMatches, 10) : enc.awayPoints || 0;
            const isFinished = enc.status === 'finished' || (homeScore > 0 || awayScore > 0);

            const createdEncounter = await prisma.encounter.create({
                data: {
                    categoryId: catId,
                    groupId,
                    homeTeamId,
                    awayTeamId,
                    scheduledAt,
                    homeScore,
                    awayScore,
                    status: isFinished ? EncounterStatus.FINISHED : EncounterStatus.SCHEDULED,
                    location: enc.location || null,
                },
            });

            encounterIdMap.set(rawEncId, createdEncounter.id);
        }

        // 5. Matches & Match Participants & Team Members
        const teamMemberSet = new Set<string>();

        for (const m of matches || []) {
            if (!m.matchId) continue;
            const encounterId = m.encounterId ? encounterIdMap.get(String(m.encounterId)) || null : null;
            const catId = m.categoryId ? catIdMap.get(String(m.categoryId)) : null;
            const groupId = m.groupId ? groupIdMap.get(String(m.groupId)) || null : null;

            if (!catId) continue;

            const matchType = m.matchType === 'double' ? MatchType.DOUBLE : MatchType.SINGLE;
            const homeScore = m.setsHome !== undefined ? parseInt(m.setsHome, 10) : 0;
            const awayScore = m.setsGuest !== undefined ? parseInt(m.setsGuest, 10) : 0;

            let winner: MatchWinner = MatchWinner.PENDING;
            if (m.winner === 'home') winner = MatchWinner.HOME;
            else if (m.winner === 'guest') winner = MatchWinner.AWAY;
            else if (m.winner === 'draw') winner = MatchWinner.DRAW;

            const isFinished = homeScore > 0 || awayScore > 0 || winner !== MatchWinner.PENDING;

            const createdMatch = await prisma.match.create({
                data: {
                    categoryId: catId,
                    groupId,
                    encounterId,
                    matchType,
                    label: m.matchPosition || (matchType === MatchType.DOUBLE ? 'Doppel' : 'Einzel'),
                    result: m.setsScore || (m.sets && m.sets.length > 0 ? m.sets.join(' ') : null),
                    homeScore,
                    awayScore,
                    winner,
                    status: isFinished ? EncounterStatus.FINISHED : EncounterStatus.SCHEDULED,
                },
            });

            // Add Participants & Ensure Team Members
            const addParticipant = async (player: any, side: ParticipantSide, pos: number) => {
                if (!player) return;
                const lic = player.licenceNr || player.playerId;
                if (!lic) return;
                const userId = userIdMap.get(String(lic));
                if (!userId) return;

                // Find encounter home/away team
                let teamId: string | null = null;
                if (encounterId) {
                    const enc = await prisma.encounter.findUnique({
                        where: { id: encounterId },
                        select: { homeTeamId: true, awayTeamId: true },
                    });
                    teamId = side === ParticipantSide.HOME ? enc?.homeTeamId || null : enc?.awayTeamId || null;
                }

                await prisma.matchParticipant.create({
                    data: {
                        matchId: createdMatch.id,
                        userId,
                        side,
                        position: pos,
                        teamId,
                    },
                });

                // User Request: "make sure to also create the TeamMember entries"
                if (teamId && !teamMemberSet.has(`${teamId}_${userId}`)) {
                    teamMemberSet.add(`${teamId}_${userId}`);
                    await prisma.teamMember.upsert({
                        where: {
                            teamId_userId: {
                                teamId,
                                userId,
                            },
                        },
                        update: {},
                        create: {
                            teamId,
                            userId,
                            role: 'PLAYER',
                        },
                    });
                }
            };

            // Home player(s)
            if (m.homePlayer1) await addParticipant(m.homePlayer1, ParticipantSide.HOME, 1);
            else if (m.player1Licence) await addParticipant({ licenceNr: m.player1Licence }, ParticipantSide.HOME, 1);

            if (m.homePlayer2) await addParticipant(m.homePlayer2, ParticipantSide.HOME, 2);
            else if (m.player1PartnerLicence) await addParticipant({ licenceNr: m.player1PartnerLicence }, ParticipantSide.HOME, 2);

            // Away player(s)
            if (m.guestPlayer1) await addParticipant(m.guestPlayer1, ParticipantSide.AWAY, 1);
            else if (m.player2Licence) await addParticipant({ licenceNr: m.player2Licence }, ParticipantSide.AWAY, 1);

            if (m.guestPlayer2) await addParticipant(m.guestPlayer2, ParticipantSide.AWAY, 2);
            else if (m.player2PartnerLicence) await addParticipant({ licenceNr: m.player2PartnerLicence }, ParticipantSide.AWAY, 2);
        }
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

        // 4. Competitions, Categories, Encounters, Matches, and TeamMembers
        await this.ingestCompetitionsAndEncounters(
            data.competitions || [],
            data.categories || [],
            data.groups || [],
            data.encounters || [],
            data.matches || [],
            clubIdMap,
            seasonIdMap,
            userIdMap,
            sttId
        );

        counts.competitions = (data.competitions || []).length;
        counts.categories = (data.categories || []).length;
        counts.groups = (data.groups || []).length;
        counts.encounters = (data.encounters || []).length;
        counts.matches = (data.matches || []).length;

        console.log(`✅ [Database Ingestion] Delta successfully applied to PostgreSQL.`);
        return { success: true, importedCounts: counts };
    }

    /**
     * Delete All Existing Sports Records and Bulk-Load Full Normalized V2 Datasets
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

        // Helper to load JSON file if exists
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

        // 5. Competitions & Categories
        notify('competitions', 0, undefined, '🏆 Ingesting Competitions and Categories...');
        const competitions = await loadJson('competitions.json');
        const categories = await loadJson('categories.json');
        const groups = await loadJson('groups.json');
        const encounters = await loadJson('encounters.json');
        const matches = await loadJson('matches.json');

        notify('encounters_matches', 0, undefined, '⚔️ Ingesting Groups, Teams, Team Members, Encounters & Match Cards...');
        await this.ingestCompetitionsAndEncounters(
            competitions,
            categories,
            groups,
            encounters,
            matches,
            clubIdMap,
            seasonIdMap,
            userIdMap,
            sttId
        );

        counts.competitions = competitions.length;
        counts.categories = categories.length;
        counts.groups = groups.length;
        counts.encounters = encounters.length;
        counts.matches = matches.length;

        notify('done', 100, 100, '🎉 Complete Database Reset & Bulk Ingestion finished successfully!');
        return { success: true, counts };
    }
}
