import fs from 'fs';
import readline from 'readline';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { basePrisma as prisma } from '../config/prisma';
import { getScraperConfig } from '../scraper/config';
import {
    AssociationLevel,
    LicenseType,
    LicenseStatus,
    LicenseScope,
    CompetitionType,
    CompetitionStatus,
    GenderRestriction,
    Gender,
    EncounterStatus,
    MatchType,
    MatchWinner,
    ParticipantSide,
    UserAccountStatus,
    RatingTriggerReason,
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
    phase: 'cleanup' | 'associations' | 'seasons' | 'clubs' | 'players' | 'snapshots' | 'hierarchy' | 'encounters' | 'matches' | 'done' | 'error';
    phaseTitle: string;
    percentage: number;
    processed: number;
    total?: number;
    message: string;
    ratePerSec?: number;
    etaSec?: number;
}

function parseSafeDate(val: any, fallback: Date = new Date()): Date {
    if (!val) return fallback;
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d;
}

function parseRankingDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parts = dateStr.trim().split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(Date.UTC(year, month, day));
        }
    }
    return parseSafeDate(dateStr, new Date());
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

export function toDeterministicUUID(namespace: string, id: string): string {
    const hash = crypto.createHash('md5').update(`${namespace}:${id}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
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
            await yieldToEventLoop();
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

        const userRows: any[] = [];
        const playerMetaList: { licenseId: string; clubId: string | null; isTCard: boolean }[] = [];

        for (const p of players) {
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
            const clubId = p.clubNr ? clubIdMap.get(String(p.clubNr)) : null;
            const isTCard = /t-card/i.test(p.clubName || '');

            userRows.push({
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
            });

            playerMetaList.push({
                licenseId,
                clubId: clubId || null,
                isTCard,
            });
        }

        // Batch insert Users
        for (let i = 0; i < userRows.length; i += 1000) {
            await prisma.user.createMany({
                data: userRows.slice(i, i + 1000),
                skipDuplicates: true,
            });
            await yieldToEventLoop();
        }

        // Retrieve created/existing user IDs for mapping
        const dbUsers = await prisma.user.findMany({
            where: {
                licenseId: { not: null },
            },
            select: { id: true, licenseId: true },
        });

        for (const u of dbUsers) {
            if (u.licenseId) {
                userIdMap.set(u.licenseId, u.id);
            }
        }

        // Batch insert Licenses
        const licenseRows: any[] = [];
        for (const meta of playerMetaList) {
            const uid = userIdMap.get(meta.licenseId);
            if (!uid) continue;

            licenseRows.push({
                userId: uid,
                type: meta.isTCard ? LicenseType.PLAYER_TCARD : LicenseType.PLAYER_REGULAR,
                status: LicenseStatus.APPROVED,
                scope: LicenseScope.ALL,
                clubId: meta.clubId,
                associationId: sttId,
                seasonId: defaultSeasonId,
                validFrom: new Date('2024-07-01'),
                validUntil: new Date('2025-06-30'),
                autoApproved: true,
                appliedByUserId: uid,
            });
        }

        for (let i = 0; i < licenseRows.length; i += 1000) {
            await prisma.license.createMany({
                data: licenseRows.slice(i, i + 1000),
                skipDuplicates: true,
            });
            await yieldToEventLoop();
        }

        return userIdMap;
    }

    /**
     * Ingest Player Elo Rating Snapshots Timeline into PostgreSQL
     */
    public static async ingestRatingSnapshotsStreaming(
        historiesStream: AsyncGenerator<any>,
        userIdMap: Map<string, string>,
        sttId: string,
        onProgress?: (prog: IngestionProgress) => void,
        estimatedSnapshotsTotal: number = 1277000,
        signal?: AbortSignal
    ): Promise<number> {
        let snapshotBatch: any[] = [];
        let snapshotsCount = 0;
        const startTime = Date.now();

        const flushSnapshots = async () => {
            if (snapshotBatch.length > 0) {
                await prisma.ratingSnapshotHistory.createMany({
                    data: snapshotBatch,
                    skipDuplicates: true,
                });
                snapshotBatch = [];
                await yieldToEventLoop();
            }
        };

        for await (const p of historiesStream) {
            if (signal?.aborted) {
                throw new Error('Rating snapshot ingestion cancelled by administrator.');
            }
            if (!p || !p.licenceNr || !Array.isArray(p.history)) continue;
            const licenceNr = String(p.licenceNr).trim();
            const userId = userIdMap.get(licenceNr);
            if (!userId) continue;

            for (const h of p.history) {
                if (signal?.aborted) {
                    throw new Error('Rating snapshot ingestion cancelled by administrator.');
                }
                if (!h || h.elo === undefined || h.elo === null) continue;
                const elo = typeof h.elo === 'number' ? h.elo : parseFloat(h.elo) || 1000;
                const level = h.classification || h.classificationMen || h.classificationWomen || 'D1';
                const gender = h.rankWomen ? Gender.FEMALE : Gender.MALE;
                const effectiveFrom = parseRankingDate(h.rankingDate);
                const rankOverall = h.rankTotal ? parseInt(h.rankTotal, 10) : null;
                const rankGender = h.rankMen ? parseInt(h.rankMen, 10) : h.rankWomen ? parseInt(h.rankWomen, 10) : null;

                snapshotBatch.push({
                    id: toDeterministicUUID('rating', `${userId}_${effectiveFrom.getTime()}_${h.rankingDate || ''}`),
                    userId,
                    associationId: sttId,
                    elo,
                    level,
                    gender,
                    playingGender: gender,
                    rankOverall: isNaN(rankOverall as any) ? null : rankOverall,
                    rankGender: isNaN(rankGender as any) ? null : rankGender,
                    effectiveFrom,
                    triggerReason: RatingTriggerReason.MONTHLY_SCHEDULE,
                    metadata: {
                        delta: h.delta,
                        ageclass: h.ageclass,
                    },
                });

                snapshotsCount++;

                if (snapshotBatch.length >= 1000) {
                    await flushSnapshots();

                    if (onProgress && snapshotsCount % 10000 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const rate = elapsed > 0 ? Math.round(snapshotsCount / elapsed) : 0;
                        const total = Math.max(estimatedSnapshotsTotal, snapshotsCount);
                        const remaining = Math.max(0, total - snapshotsCount);
                        const eta = rate > 0 ? Math.round(remaining / rate) : 0;
                        const pct = Math.min(25, 15 + (snapshotsCount / total) * 10);

                        onProgress({
                            phase: 'snapshots',
                            phaseTitle: 'Streaming Rating Snapshots',
                            percentage: parseFloat(pct.toFixed(1)),
                            processed: snapshotsCount,
                            total,
                            ratePerSec: rate,
                            etaSec: eta,
                            message: `📈 Ingested ${snapshotsCount.toLocaleString('de-CH')} / ${total.toLocaleString('de-CH')} rating snapshots (${rate.toLocaleString('de-CH')}/s)`,
                        });
                    }
                }
            }
        }

        await flushSnapshots();
        return snapshotsCount;
    }

    /**
     * Sanitize clicktt competition name and build multi-lingual representation (de, fr, it, en)
     */
    public static sanitizeAndTranslateCompetitionName(rawName: string): {
        sanitizedName: string;
        nameI18n: { de: string; fr: string; it: string; en: string };
    } {
        if (!rawName) {
            return {
                sanitizedName: '',
                nameI18n: { de: '', fr: '', it: '', en: '' },
            };
        }

        // Clean template expressions like ${nationalligen}, ${nationalliga}, etc.
        const baseName = rawName
            .replace(/\$\{\s*nationalligen\s*\}/gi, 'Nationalligen')
            .replace(/\$\{\s*nationalliga\s*\}/gi, 'Nationalliga')
            .replace(/\$\{\s*([a-z0-9_-]+)\s*\}/gi, (_m, key) => key.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();

        // 1. STT Nationalligen
        const sttNatMatch = baseName.match(/^STT\s+Nationalligen\s*(.*)$/i);
        if (sttNatMatch) {
            const seasonSuffix = sttNatMatch[1] ? ` ${sttNatMatch[1].trim()}` : '';
            return {
                sanitizedName: `STT Nationalligen${seasonSuffix}`,
                nameI18n: {
                    de: `STT Nationalligen${seasonSuffix}`,
                    fr: `STT Ligues Nationales${seasonSuffix}`,
                    it: `STT Leghe Nazionali${seasonSuffix}`,
                    en: `STT National Leagues${seasonSuffix}`,
                },
            };
        }

        // 2. Schweizer Cup / Coupe Suisse / Coppa Svizzera
        const cupMatch = baseName.match(/^(Schweizer\s+Cup|Coupe\s+Suisse|Coppa\s+Svizzera|Swiss\s+Cup)\s*(.*)$/i);
        if (cupMatch) {
            const seasonSuffix = cupMatch[2] ? ` ${cupMatch[2].trim()}` : '';
            return {
                sanitizedName: `Schweizer Cup${seasonSuffix}`,
                nameI18n: {
                    de: `Schweizer Cup${seasonSuffix}`,
                    fr: `Coupe Suisse${seasonSuffix}`,
                    it: `Coppa Svizzera${seasonSuffix}`,
                    en: `Swiss Cup${seasonSuffix}`,
                },
            };
        }

        // 3. Regional Mannschaftsmeisterschaft / Championnat
        const mmMatch = baseName.match(/^([A-Z]+)\s+Mannschaftsmeisterschaft\s*(.*)$/i);
        if (mmMatch) {
            const prefix = mmMatch[1].toUpperCase();
            const seasonSuffix = mmMatch[2] ? ` ${mmMatch[2].trim()}` : '';
            return {
                sanitizedName: `${prefix} Mannschaftsmeisterschaft${seasonSuffix}`,
                nameI18n: {
                    de: `${prefix} Mannschaftsmeisterschaft${seasonSuffix}`,
                    fr: `${prefix} Championnat Interclubs${seasonSuffix}`,
                    it: `${prefix} Campionato a squadre${seasonSuffix}`,
                    en: `${prefix} Team Championship${seasonSuffix}`,
                },
            };
        }

        // 4. Default fallback: keep sanitized name across locales
        return {
            sanitizedName: baseName,
            nameI18n: {
                de: baseName,
                fr: baseName,
                it: baseName,
                en: baseName,
            },
        };
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
            const { sanitizedName, nameI18n } = ClickTTDbIngestionService.sanitizeAndTranslateCompetitionName(c.name);
            const isCup = c.type === 'cup' || /cup|coupe/i.test(sanitizedName);
            const isTourn = c.type === 'tournament' || /turnier|tournament/i.test(sanitizedName);
            const type = isCup ? CompetitionType.CUP : isTourn ? CompetitionType.TOURNAMENT : CompetitionType.LEAGUE;
            const id = toDeterministicUUID('comp', rawId);

            compRows.push({
                id,
                name: sanitizedName,
                nameI18n,
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
            await yieldToEventLoop();
        }

        // 2. Categories Batch
        const catRows: any[] = [];
        for (const cat of categories || []) {
            if (!cat.categoryId || !cat.name) continue;
            const rawCatId = String(cat.categoryId);
            const parentCompId = cat.competitionId ? compIdMap.get(String(cat.competitionId)) : null;
            if (!parentCompId) continue;

            const sanitizedCatName = cat.name.replace(/\$\{\s*([a-z0-9_-]+)\s*\}/gi, (_m: string, k: string) => k.toUpperCase()).trim();
            const id = toDeterministicUUID('cat', rawCatId);
            catRows.push({
                id,
                competitionId: parentCompId,
                name: sanitizedCatName,
                teamSize: cat.teamSize || (/doppel/i.test(sanitizedCatName) ? 2 : 1),
                genderRestriction: GenderRestriction.ANY,
            });
            catIdMap.set(rawCatId, id);
        }

        for (let i = 0; i < catRows.length; i += 500) {
            await prisma.category.createMany({
                data: catRows.slice(i, i + 500),
                skipDuplicates: true,
            });
            await yieldToEventLoop();
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

            const sanitizedGroupName = g.name.replace(/\$\{\s*([a-z0-9_-]+)\s*\}/gi, (_m: string, k: string) => k.toUpperCase()).trim();
            const gId = toDeterministicUUID('group', rawGroupId);
            groupRows.push({
                id: gId,
                categoryId: catId,
                name: sanitizedGroupName,
            });
            groupIdMap.set(rawGroupId, gId);

            for (const t of g.teams || []) {
                if (!t.teamName) continue;
                const rawTeamId = t.teamId ? String(t.teamId) : null;
                const clubId = t.clubNr ? clubIdMap.get(String(t.clubNr)) || null : null;
                const tId = toDeterministicUUID('team', rawTeamId ? `id_${rawTeamId}` : `cat_${catId}_${t.teamName.trim()}`);

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
            await yieldToEventLoop();
        }

        for (let i = 0; i < teamRows.length; i += 500) {
            await prisma.team.createMany({
                data: teamRows.slice(i, i + 500),
                skipDuplicates: true,
            });
            await yieldToEventLoop();
        }

        for (let i = 0; i < standingsRows.length; i += 500) {
            await prisma.groupStanding.createMany({
                data: standingsRows.slice(i, i + 500),
                skipDuplicates: true,
            });
            await yieldToEventLoop();
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

        const targetFile = fs.existsSync(jsonlPath) ? jsonlPath : fs.existsSync(jsonPath) ? jsonPath : null;
        if (!targetFile) return;

        const fileStream = fs.createReadStream(targetFile, { encoding: 'utf-8' });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let objectBuffer = '';
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        for await (const line of rl) {
            const trimmed = line.trim();
            if (!trimmed || (depth === 0 && (trimmed === '[' || trimmed === ']'))) continue;

            // Fast path for single-line JSON objects (covers 99.9% of .jsonl and array .json lines)
            if (depth === 0) {
                let cleanLine = trimmed;
                if (cleanLine.endsWith(',')) cleanLine = cleanLine.slice(0, -1).trim();
                if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
                    try {
                        yield JSON.parse(cleanLine);
                        continue;
                    } catch {
                        // Fall through to multi-line parser if fast path fails
                    }
                }
            }

            // Robust multi-line object accumulator
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (escapeNext) {
                    escapeNext = false;
                    objectBuffer += char;
                    continue;
                }
                if (char === '\\' && inString) {
                    escapeNext = true;
                    objectBuffer += char;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    objectBuffer += char;
                    continue;
                }
                if (!inString) {
                    if (char === '{') {
                        depth++;
                    } else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            objectBuffer += char;
                            try {
                                yield JSON.parse(objectBuffer.trim());
                            } catch {}
                            objectBuffer = '';
                            continue;
                        }
                    }
                }
                if (depth > 0) {
                    objectBuffer += char;
                }
            }
            if (depth > 0) {
                objectBuffer += '\n';
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
        onProgress?: (progress: IngestionProgress) => void,
        estimatedEncountersTotal: number = 365000,
        estimatedMatchesTotal: number = 1430000,
        signal?: AbortSignal
    ): Promise<{ encountersCount: number; matchesCount: number }> {
        // Flat compact metadata map: encId -> "homeTeamId|awayTeamId|categoryId|groupId"
        const encounterMetaMap = new Map<string, string>();

        let encounterBatch: any[] = [];
        let missingTeamsBatch: any[] = [];
        let encountersCount = 0;
        const encStartTime = Date.now();

        const flushTeams = async () => {
            if (missingTeamsBatch.length > 0) {
                await prisma.team.createMany({
                    data: missingTeamsBatch,
                    skipDuplicates: true,
                });
                missingTeamsBatch = [];
                await yieldToEventLoop();
            }
        };

        // 1. Process Encounters
        for await (const enc of encountersStream) {
            if (signal?.aborted) {
                throw new Error('Encounters ingestion cancelled by administrator.');
            }
            if (!enc || !enc.encounterId) continue;
            const rawEncId = String(enc.encounterId);
            const catId = enc.categoryId ? catIdMap.get(String(enc.categoryId)) || toDeterministicUUID('cat', String(enc.categoryId)) : null;
            const groupId = enc.groupId ? groupIdMap.get(String(enc.groupId)) || toDeterministicUUID('group', String(enc.groupId)) : null;
            if (!catId) continue;

            const homeTeamKey = enc.homeTeamId ? teamIdMap.get(String(enc.homeTeamId)) : null;
            const homeTeamNameKey = enc.homeTeamName ? teamIdMap.get(`${catId}_${enc.homeTeamName.trim()}`) : null;
            let homeTeamId = homeTeamKey || homeTeamNameKey || toDeterministicUUID('team', enc.homeTeamId ? `id_${enc.homeTeamId}` : `cat_${catId}_${(enc.homeTeamName || 'Home Team').trim()}`);

            const awayTeamKey = enc.awayTeamId ? teamIdMap.get(String(enc.awayTeamId)) : null;
            const awayTeamNameKey = enc.awayTeamName ? teamIdMap.get(`${catId}_${enc.awayTeamName.trim()}`) : null;
            let awayTeamId = awayTeamKey || awayTeamNameKey || toDeterministicUUID('team', enc.awayTeamId ? `id_${enc.awayTeamId}` : `cat_${catId}_${(enc.awayTeamName || 'Away Team').trim()}`);

            if (!homeTeamKey && !homeTeamNameKey) {
                const clubId = enc.homeClubNr ? clubIdMap.get(String(enc.homeClubNr)) || null : null;
                const teamName = enc.homeTeamName || `Home Team`;
                missingTeamsBatch.push({ id: homeTeamId, categoryId: catId, name: teamName, clubId });
                if (enc.homeTeamId) teamIdMap.set(String(enc.homeTeamId), homeTeamId);
                teamIdMap.set(`${catId}_${teamName.trim()}`, homeTeamId);
            }

            if (!awayTeamKey && !awayTeamNameKey) {
                const clubId = enc.awayClubNr ? clubIdMap.get(String(enc.awayClubNr)) || null : null;
                const teamName = enc.awayTeamName || `Away Team`;
                missingTeamsBatch.push({ id: awayTeamId, categoryId: catId, name: teamName, clubId });
                if (enc.awayTeamId) teamIdMap.set(String(enc.awayTeamId), awayTeamId);
                teamIdMap.set(`${catId}_${teamName.trim()}`, awayTeamId);
            }

            const encId = toDeterministicUUID('encounter', rawEncId);
            const scheduledAt = parseSafeDate(enc.scheduledDate || enc.scheduledAt || enc.date, new Date());
            const homeScore = enc.homeMatches !== undefined ? parseInt(enc.homeMatches, 10) : enc.homePoints !== undefined ? parseInt(enc.homePoints, 10) : enc.scoreHome !== undefined ? parseInt(enc.scoreHome, 10) : 0;
            const awayScore = enc.awayMatches !== undefined ? parseInt(enc.awayMatches, 10) : enc.awayPoints !== undefined ? parseInt(enc.awayPoints, 10) : enc.scoreGuest !== undefined ? parseInt(enc.scoreGuest, 10) : 0;
            const isFinished = enc.status === 'finished' || enc.isPlayed === true || homeScore > 0 || awayScore > 0;

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

            // Store packed metadata string (homeTeamId|awayTeamId|catId|groupId)
            encounterMetaMap.set(rawEncId, `${homeTeamId}|${awayTeamId}|${catId}|${groupId || ''}`);
            encountersCount++;

            if (missingTeamsBatch.length >= 500) {
                await flushTeams();
            }

            if (encounterBatch.length >= 1000) {
                await flushTeams();
                await prisma.encounter.createMany({
                    data: encounterBatch,
                    skipDuplicates: true,
                });
                encounterBatch = [];
                await yieldToEventLoop();

                if (onProgress && encountersCount % 5000 === 0) {
                    const elapsed = (Date.now() - encStartTime) / 1000;
                    const rate = elapsed > 0 ? Math.round(encountersCount / elapsed) : 0;
                    const totalEnc = Math.max(estimatedEncountersTotal, encountersCount);
                    const remaining = Math.max(0, totalEnc - encountersCount);
                    const eta = rate > 0 ? Math.round(remaining / rate) : 0;
                    const pct = Math.min(45, 25 + (encountersCount / totalEnc) * 20);

                    onProgress({
                        phase: 'encounters',
                        phaseTitle: 'Streaming Encounters',
                        percentage: parseFloat(pct.toFixed(1)),
                        processed: encountersCount,
                        total: totalEnc,
                        ratePerSec: rate,
                        etaSec: eta,
                        message: `⚔️ Ingested ${encountersCount.toLocaleString('de-CH')} / ${totalEnc.toLocaleString('de-CH')} encounters (${rate.toLocaleString('de-CH')}/s)`,
                    });
                }
            }
        }

        await flushTeams();
        if (encounterBatch.length > 0) {
            await prisma.encounter.createMany({
                data: encounterBatch,
                skipDuplicates: true,
            });
            encounterBatch = [];
            await yieldToEventLoop();
        }

        // 2. Process Matches & MatchParticipants & TeamMembers
        let matchBatch: any[] = [];
        let participantBatch: any[] = [];
        let teamMemberBatch: any[] = [];
        const seenTeamMembers = new Set<string>();
        let matchesCount = 0;
        const matchStartTime = Date.now();

        const flushMatchesAndParticipants = async () => {
            if (matchBatch.length > 0) {
                await prisma.match.createMany({
                    data: matchBatch,
                    skipDuplicates: true,
                });
                matchBatch = [];
            }

            if (participantBatch.length > 0) {
                await prisma.matchParticipant.createMany({
                    data: participantBatch,
                    skipDuplicates: true,
                });
                participantBatch = [];
            }

            if (teamMemberBatch.length > 0) {
                await prisma.teamMember.createMany({
                    data: teamMemberBatch,
                    skipDuplicates: true,
                });
                teamMemberBatch = [];
            }

            await yieldToEventLoop();
        };

        for await (const m of matchesStream) {
            if (signal?.aborted) {
                throw new Error('Matches ingestion cancelled by administrator.');
            }
            if (!m || !m.matchId) continue;

            const rawEncId = m.encounterId ? String(m.encounterId) : null;
            const metaStr = rawEncId ? encounterMetaMap.get(rawEncId) : null;
            let metaHomeTeamId: string | null = null;
            let metaAwayTeamId: string | null = null;
            let metaCatId: string | null = null;
            let metaGroupId: string | null = null;

            if (metaStr) {
                const parts = metaStr.split('|');
                metaHomeTeamId = parts[0] || null;
                metaAwayTeamId = parts[1] || null;
                metaCatId = parts[2] || null;
                metaGroupId = parts[3] || null;
            }

            const catId = m.categoryId ? catIdMap.get(String(m.categoryId)) || toDeterministicUUID('cat', String(m.categoryId)) : metaCatId;
            const groupId = m.groupId ? groupIdMap.get(String(m.groupId)) || toDeterministicUUID('group', String(m.groupId)) : metaGroupId;
            const encounterId = rawEncId ? toDeterministicUUID('encounter', rawEncId) : null;

            if (!catId) continue;

            const matchId = toDeterministicUUID('match', String(m.matchId));
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

                const teamId = side === ParticipantSide.HOME ? metaHomeTeamId : metaAwayTeamId;

                participantBatch.push({
                    id: toDeterministicUUID('part', `${matchId}_${userId}_${side}_${pos}`),
                    matchId,
                    userId,
                    side,
                    position: pos,
                    teamId,
                });

                if (teamId) {
                    const memberKey = `${teamId}_${userId}`;
                    if (!seenTeamMembers.has(memberKey)) {
                        seenTeamMembers.add(memberKey);
                        teamMemberBatch.push({
                            id: toDeterministicUUID('member', memberKey),
                            teamId,
                            userId,
                            role: 'PLAYER',
                        });
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

            if (matchBatch.length >= 1000 || participantBatch.length >= 1000 || teamMemberBatch.length >= 1000) {
                await flushMatchesAndParticipants();
            }

            if (onProgress && matchesCount % 5000 === 0) {
                const elapsed = (Date.now() - matchStartTime) / 1000;
                const rate = elapsed > 0 ? Math.round(matchesCount / elapsed) : 0;
                const totalMat = Math.max(estimatedMatchesTotal, matchesCount);
                const remaining = Math.max(0, totalMat - matchesCount);
                const eta = rate > 0 ? Math.round(remaining / rate) : 0;
                const pct = Math.min(99, 45 + (matchesCount / totalMat) * 54);

                onProgress({
                    phase: 'matches',
                    phaseTitle: 'Streaming Matches & Scorecards',
                    percentage: parseFloat(pct.toFixed(1)),
                    processed: matchesCount,
                    total: totalMat,
                    ratePerSec: rate,
                    etaSec: eta,
                    message: `🏓 Ingested ${matchesCount.toLocaleString('de-CH')} / ${totalMat.toLocaleString('de-CH')} matches (${rate.toLocaleString('de-CH')}/s)`,
                });
            }
        }

        // Flush remaining batches
        await flushMatchesAndParticipants();

        return { encountersCount, matchesCount };
    }

    /**
     * Ingest Delta Sync Payload into PostgreSQL automatically
     */
    public static async ingestDelta(
        deltaPayload: any,
        signal?: AbortSignal
    ): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
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
            clubIdMap,
            undefined,
            (data.encounters || []).length,
            (data.matches || []).length,
            signal
        );

        counts.encounters = result.encountersCount;
        counts.matches = result.matchesCount;

        console.log(`✅ [Database Ingestion] Delta successfully applied to PostgreSQL.`);
        return { success: true, importedCounts: counts };
    }

    /**
     * Delete All Existing Sports Records and Bulk-Load Full Normalized Datasets
     */
    public static async resetAndLoadFullDatasets(
        onProgress?: (p: IngestionProgress) => void,
        signal?: AbortSignal
    ): Promise<{ success: boolean; counts: Record<string, number> }> {
        const notify = (prog: IngestionProgress) => {
            console.log(`[DB Bulk Ingest] [${prog.percentage}%] ${prog.message}`);
            if (onProgress) onProgress(prog);
        };

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        notify({
            phase: 'cleanup',
            phaseTitle: 'Purging Database',
            percentage: 1,
            processed: 0,
            message: '🧹 Purging existing sports database records...',
        });

        // 1. Instant atomic purge of sports data (preserving SuperAdmin & System Settings)
        try {
            await prisma.$executeRawUnsafe(`
                TRUNCATE TABLE 
                    "MatchParticipant",
                    "Match",
                    "GroupStanding",
                    "Encounter",
                    "TeamMember",
                    "Team",
                    "CategoryGroup",
                    "Category",
                    "CompetitionSpeakerCallout",
                    "CompetitionUserRole",
                    "CompetitionLocation",
                    "Competition",
                    "CourseAttendance",
                    "RefresherCourse",
                    "RatingSnapshotHistory",
                    "License",
                    "Season",
                    "UserAssociationRole",
                    "UserClubRole",
                    "UserRelationship",
                    "PushSubscription",
                    "ClubAssociation",
                    "LocationClub",
                    "Club",
                    "AssociationHierarchy",
                    "AssociationSport",
                    "Association"
                CASCADE;
            `);
        } catch (truncErr) {
            console.warn('[DB Bulk Ingest] Fallback to deleteMany after truncate notice:', truncErr);
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
        }

        // Delete all non-superadmin users
        await prisma.user.deleteMany({
            where: { isSuperAdmin: false },
        });

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        notify({
            phase: 'associations',
            phaseTitle: 'Associations Hierarchy',
            percentage: 3,
            processed: 1,
            total: 9,
            message: '🏛️ Initializing National and Regional Associations...',
        });
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

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 2. Seasons
        notify({
            phase: 'seasons',
            phaseTitle: 'Seasons & Schedules',
            percentage: 5,
            processed: 0,
            message: '📅 Ingesting Seasons dataset...',
        });
        const seasons = await loadJson('seasons.json');
        const seasonIdMap = await this.ingestSeasons(seasons, sttId);
        counts.seasons = seasons.length;

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 3. Clubs
        notify({
            phase: 'clubs',
            phaseTitle: 'Clubs & Affiliations',
            percentage: 8,
            processed: 0,
            total: 256,
            message: '🏢 Ingesting Clubs dataset...',
        });
        const clubs = await loadJson('clubs.json');
        const clubIdMap = await this.ingestClubs(clubs, regionMap, sttId);
        counts.clubs = clubs.length;

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 4. Players
        notify({
            phase: 'players',
            phaseTitle: 'Players & Licenses',
            percentage: 12,
            processed: 0,
            total: 12436,
            message: '🏓 Ingesting Players dataset (User + License)...',
        });
        const players = await loadJson('players.json');
        const userIdMap = await this.ingestPlayers(players, clubIdMap, seasonIdMap, sttId);
        counts.players = players.length;

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 5. Rating Snapshot Histories (Elo Timeline)
        notify({
            phase: 'snapshots',
            phaseTitle: 'Streaming Rating Snapshots',
            percentage: 15,
            processed: 0,
            total: 1277000,
            message: '📈 Streaming & Ingesting Elo Rating Timeline Snapshots...',
        });
        const historiesStream = this.streamEntityRecords('player_histories');
        const snapshotsCount = await this.ingestRatingSnapshotsStreaming(
            historiesStream,
            userIdMap,
            sttId,
            (prog) => notify(prog),
            1277000,
            signal
        );
        counts.ratingSnapshots = snapshotsCount;

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 6. Competitions, Categories, Groups, Teams
        notify({
            phase: 'hierarchy',
            phaseTitle: 'Competitions & Groups',
            percentage: 25,
            processed: 0,
            message: '🏆 Ingesting Competitions, Categories, Groups & Teams...',
        });
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

        if (signal?.aborted) {
            throw new Error('Database ingestion cancelled by administrator.');
        }

        // 7. Encounters Streaming (high speed, constant memory)
        notify({
            phase: 'encounters',
            phaseTitle: 'Streaming Encounters',
            percentage: 35,
            processed: 0,
            total: 364844,
            message: '⚔️ Streaming & Ingesting Encounters...',
        });
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
            (prog) => notify(prog),
            364844,
            1430462,
            signal
        );

        counts.encounters = encountersCount;
        counts.matches = matchesCount;

        notify({
            phase: 'done',
            phaseTitle: 'Ingestion Completed',
            percentage: 100,
            processed: matchesCount,
            total: matchesCount,
            message: `🎉 Full Database Reset & Ingestion completed! Ingested ${matchesCount.toLocaleString('de-CH')} matches, ${encountersCount.toLocaleString('de-CH')} encounters, ${snapshotsCount.toLocaleString('de-CH')} rating snapshots, ${counts.categories} categories, and ${counts.players} players.`,
        });
        return { success: true, counts };
    }
}
