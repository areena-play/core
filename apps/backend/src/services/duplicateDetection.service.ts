import { prisma } from '../config/prisma';
import { AuditService } from './audit.service';
import { AuditCategory } from '@areena/shared';

export interface DuplicateMatchReason {
    type: 'EXACT_NAME' | 'SIMILAR_NAME' | 'EXACT_DOB' | 'SIMILAR_DOB' | 'SAME_LICENSE' | 'NAME_SWAPPED' | 'SAME_PHONE' | 'SAME_EMAIL';
    description: string;
}

export interface DuplicateCandidate {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
        birthDate: Date | null;
        gender: string | null;
        eloPoints: number;
        currentLevel?: string;
        licenseId: string | null;
        canLogin: boolean;
        accountStatus: string;
        isSuperAdmin: boolean;
        emailVerified: boolean;
        clubRoles?: {
            id: string;
            role: string;
            club: { id: string; name: string; code: string };
        }[];
        associationRoles?: {
            id: string;
            role: string;
            association: { id: string; name: string; shortName: string; code: string };
        }[];
        licenses?: {
            id: string;
            type: string;
            status: string;
            club?: { id: string; name: string } | null;
        }[];
    };
    similarity: number; // 0 to 100
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reasons: DuplicateMatchReason[];
    isClaimed: boolean;
    canBeClaimed: boolean;
}

export interface DuplicateCluster {
    clusterId: string;
    similarity: number;
    confidence: 'HIGH' | 'MEDIUM';
    reasons: DuplicateMatchReason[];
    users: DuplicateCandidate['user'][];
}

/**
 * Normalize string by converting to lowercase, trimming, and replacing diacritics / umlauts.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .trim()
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove remaining diacritics (é, è, ç, etc.)
        .replace(/[^a-z0-9]/g, ''); // strip non-alphanumeric
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
    const a = normalizeString(s1);
    const b = normalizeString(s2);

    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Compute similarity ratio between 0 and 1 using Levenshtein distance.
 */
export function stringSimilarityRatio(s1: string, s2: string): number {
    const a = normalizeString(s1);
    const b = normalizeString(s2);
    if (a === b) return 1.0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(a, b);
    return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Compare two birth dates and evaluate similarity.
 */
export function compareBirthDates(
    d1?: Date | string | null,
    d2?: Date | string | null
): { matchType: 'EXACT' | 'CLOSE' | 'SAME_YEAR' | 'DIFFERENT' | 'ONE_MISSING' | 'BOTH_MISSING'; score: number } {
    if (!d1 && !d2) {
        return { matchType: 'BOTH_MISSING', score: 0.5 };
    }
    if (!d1 || !d2) {
        return { matchType: 'ONE_MISSING', score: 0.65 };
    }

    const date1 = new Date(d1);
    const date2 = new Date(d2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        return { matchType: 'ONE_MISSING', score: 0.65 };
    }

    // Check timezone offset tolerance: within 36 hours is considered an exact date match
    const diffHours = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 3600);
    if (diffHours <= 36) {
        return { matchType: 'EXACT', score: 1.0 };
    }

    const y1 = date1.getUTCFullYear();
    const m1 = date1.getUTCMonth();
    const day1 = date1.getUTCDate();

    const y2 = date2.getUTCFullYear();
    const m2 = date2.getUTCMonth();
    const day2 = date2.getUTCDate();

    if (y1 === y2 && m1 === m2 && day1 === day2) {
        return { matchType: 'EXACT', score: 1.0 };
    }

    if (y1 === y2 && m1 === m2 && Math.abs(day1 - day2) <= 2) {
        return { matchType: 'CLOSE', score: 0.9 };
    }

    // Swapped day and month (e.g. 03/11 vs 11/03)
    if (y1 === y2 && m1 + 1 === day2 && day1 === m2 + 1) {
        return { matchType: 'CLOSE', score: 0.85 };
    }

    if (y1 === y2 && m1 === m2) {
        return { matchType: 'CLOSE', score: 0.75 };
    }

    if (y1 === y2) {
        return { matchType: 'SAME_YEAR', score: 0.6 };
    }

    // Different year: if off by exactly 1 year typo (same month & day)
    const yearDiff = Math.abs(y1 - y2);
    if (yearDiff === 1 && m1 === m2 && Math.abs(day1 - day2) <= 1) {
        return { matchType: 'CLOSE', score: 0.75 };
    }

    return { matchType: 'DIFFERENT', score: 0.0 };
}

export class DuplicateDetectionService {
    /**
     * Compute similarity details between two person profiles.
     */
    public static evaluateSimilarity(
        source: { firstName: string; lastName: string; birthDate?: Date | string | null; email?: string | null; licenseId?: string | null },
        candidate: { firstName: string; lastName: string; birthDate?: Date | string | null; email?: string | null; licenseId?: string | null }
    ): { similarity: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reasons: DuplicateMatchReason[] } {
        const reasons: DuplicateMatchReason[] = [];

        // Direct check on license ID
        if (source.licenseId && candidate.licenseId && normalizeString(source.licenseId) === normalizeString(candidate.licenseId)) {
            reasons.push({ type: 'SAME_LICENSE', description: `Identical license ID (${candidate.licenseId})` });
            return { similarity: 100, confidence: 'HIGH', reasons };
        }

        // Direct check on email
        if (source.email && candidate.email && source.email.trim().toLowerCase() === candidate.email.trim().toLowerCase()) {
            reasons.push({ type: 'SAME_EMAIL', description: `Identical email address (${candidate.email})` });
            return { similarity: 98, confidence: 'HIGH', reasons };
        }

        // Check standard name matching
        const fnSim = stringSimilarityRatio(source.firstName, candidate.firstName);
        const lnSim = stringSimilarityRatio(source.lastName, candidate.lastName);
        const directNameScore = (fnSim * 0.45) + (lnSim * 0.55);

        // Check swapped name matching (first <-> last)
        const fnSwappedSim = stringSimilarityRatio(source.firstName, candidate.lastName);
        const lnSwappedSim = stringSimilarityRatio(source.lastName, candidate.firstName);
        const swappedNameScore = (fnSwappedSim * 0.5) + (lnSwappedSim * 0.5);

        const isSwapped = swappedNameScore > directNameScore && swappedNameScore >= 0.85;
        const bestNameScore = isSwapped ? swappedNameScore : directNameScore;

        if (isSwapped) {
            reasons.push({
                type: 'NAME_SWAPPED',
                description: `First and last name appear to be inverted (${candidate.firstName} ${candidate.lastName})`,
            });
        } else {
            if (fnSim >= 0.98 && lnSim >= 0.98) {
                reasons.push({ type: 'EXACT_NAME', description: 'Exact name match' });
            } else if (bestNameScore >= 0.75) {
                reasons.push({
                    type: 'SIMILAR_NAME',
                    description: `Similar name spelling (${candidate.firstName} ${candidate.lastName})`,
                });
            }
        }

        const dobResult = compareBirthDates(source.birthDate, candidate.birthDate);
        if (dobResult.matchType === 'EXACT') {
            reasons.push({ type: 'EXACT_DOB', description: 'Exact date of birth match' });
        } else if (dobResult.matchType === 'CLOSE') {
            reasons.push({ type: 'SIMILAR_DOB', description: 'Close date of birth (likely minor typo)' });
        } else if (dobResult.matchType === 'SAME_YEAR') {
            reasons.push({ type: 'SIMILAR_DOB', description: 'Same birth year' });
        }

        // If birth years differ significantly (e.g. diff > 1) and both provided, strongly lower duplicate likelihood
        if (dobResult.matchType === 'DIFFERENT') {
            const similarity = Math.round(bestNameScore * 40); // cap at 40%
            return {
                similarity,
                confidence: 'LOW',
                reasons,
            };
        }

        // Weight name and DOB
        let overallScore = 0;
        if (dobResult.matchType === 'EXACT') {
            overallScore = (bestNameScore * 0.7) + 0.3;
        } else if (dobResult.matchType === 'CLOSE') {
            overallScore = (bestNameScore * 0.75) + 0.2;
        } else if (dobResult.matchType === 'ONE_MISSING' || dobResult.matchType === 'BOTH_MISSING') {
            overallScore = bestNameScore * 0.92;
        } else if (dobResult.matchType === 'SAME_YEAR') {
            overallScore = (bestNameScore * 0.8) + 0.15;
        }

        const similarity = Math.min(100, Math.round(overallScore * 100));

        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (similarity >= 85 || (bestNameScore >= 0.9 && dobResult.matchType === 'EXACT')) {
            confidence = 'HIGH';
        } else if (similarity >= 65) {
            confidence = 'MEDIUM';
        }

        return { similarity, confidence, reasons };
    }

    /**
     * Find potential duplicate/similar users before adding or registering a new user.
     */
    public static async findSimilarUsers(params: {
        firstName: string;
        lastName: string;
        birthDate?: string | Date | null;
        email?: string | null;
        licenseId?: string | null;
        excludeUserId?: string;
    }): Promise<{ hasDuplicates: boolean; matches: DuplicateCandidate[] }> {
        const { firstName, lastName, birthDate, email, licenseId, excludeUserId } = params;

        if (!firstName?.trim() && !lastName?.trim()) {
            return { hasDuplicates: false, matches: [] };
        }

        const fnTrim = firstName?.trim() || '';
        const lnTrim = lastName?.trim() || '';

        const orConditions: any[] = [];

        // 1. Last name prefix / contains
        if (lnTrim.length >= 2) {
            const prefix = lnTrim.slice(0, Math.min(lnTrim.length, 3));
            orConditions.push({
                lastName: { startsWith: prefix, mode: 'insensitive' },
            });
        }

        // 2. First name prefix
        if (fnTrim.length >= 2) {
            const prefix = fnTrim.slice(0, Math.min(fnTrim.length, 3));
            orConditions.push({
                firstName: { startsWith: prefix, mode: 'insensitive' },
            });
        }

        // 3. Swapped name (first name as last name, last name as first name)
        if (fnTrim.length >= 2) {
            const prefix = fnTrim.slice(0, Math.min(fnTrim.length, 3));
            orConditions.push({
                lastName: { startsWith: prefix, mode: 'insensitive' },
            });
        }
        if (lnTrim.length >= 2) {
            const prefix = lnTrim.slice(0, Math.min(lnTrim.length, 3));
            orConditions.push({
                firstName: { startsWith: prefix, mode: 'insensitive' },
            });
        }

        // 4. Exact / close birth date range (+/- 1 year)
        if (birthDate) {
            const d = new Date(birthDate);
            if (!isNaN(d.getTime())) {
                const minYearDate = new Date(Date.UTC(d.getUTCFullYear() - 1, 0, 1));
                const maxYearDate = new Date(Date.UTC(d.getUTCFullYear() + 1, 11, 31, 23, 59, 59));
                orConditions.push({
                    birthDate: {
                        gte: minYearDate,
                        lte: maxYearDate,
                    },
                });
            }
        }

        // 5. Email matching
        if (email?.trim()) {
            orConditions.push({
                email: { equals: email.trim(), mode: 'insensitive' },
            });
        }

        // 6. License matching
        if (licenseId?.trim()) {
            orConditions.push({
                licenseId: { equals: licenseId.trim(), mode: 'insensitive' },
            });
        }

        // Fetch candidate users from database matching any of the smart criteria
        const candidates = await prisma.user.findMany({
            where: {
                id: excludeUserId ? { not: excludeUserId } : undefined,
                ...(orConditions.length > 0 ? { OR: orConditions } : {}),
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                birthDate: true,
                gender: true,
                eloPoints: true,
                currentLevel: true,
                licenseId: true,
                canLogin: true,
                accountStatus: true,
                isSuperAdmin: true,
                emailVerified: true,
                passwordHash: true,
            },
            take: 2000,
        });

        const preMatches: { user: any; evalResult: ReturnType<typeof DuplicateDetectionService.evaluateSimilarity> }[] = [];

        for (const candidate of candidates) {
            const evalResult = this.evaluateSimilarity(
                { firstName, lastName, birthDate, email, licenseId },
                {
                    firstName: candidate.firstName,
                    lastName: candidate.lastName,
                    birthDate: candidate.birthDate,
                    email: candidate.email,
                    licenseId: candidate.licenseId,
                }
            );

            if (evalResult.similarity >= 65) {
                preMatches.push({ user: candidate, evalResult });
            }
        }

        if (preMatches.length === 0) {
            return { hasDuplicates: false, matches: [] };
        }

        // Fetch relations only for matched users
        const matchedUserIds = preMatches.map((m) => m.user.id);
        const userDetails = await prisma.user.findMany({
            where: { id: { in: matchedUserIds } },
            select: {
                id: true,
                clubRoles: {
                    select: {
                        id: true,
                        role: true,
                        club: { select: { id: true, name: true, code: true } },
                    },
                },
                associationRoles: {
                    select: {
                        id: true,
                        role: true,
                        association: { select: { id: true, name: true, shortName: true, code: true } },
                    },
                },
                licenses: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        club: { select: { id: true, name: true } },
                    },
                },
            },
        });

        const detailsMap = new Map(userDetails.map((d) => [d.id, d]));

        const matches: DuplicateCandidate[] = [];

        for (const { user, evalResult } of preMatches) {
            const hasLogin = Boolean(user.canLogin && (user.passwordHash || user.emailVerified));
            const canBeClaimed = !hasLogin || user.accountStatus === 'MANAGED' || !user.passwordHash;
            const details = detailsMap.get(user.id);

            const { passwordHash: _, ...safeUser } = user;

            matches.push({
                user: {
                    ...safeUser,
                    clubRoles: details?.clubRoles || [],
                    associationRoles: details?.associationRoles || [],
                    licenses: details?.licenses || [],
                },
                similarity: evalResult.similarity,
                confidence: evalResult.confidence,
                reasons: evalResult.reasons,
                isClaimed: hasLogin,
                canBeClaimed,
            });
        }

        // Sort descending by similarity score
        matches.sort((a, b) => b.similarity - a.similarity);

        return {
            hasDuplicates: matches.length > 0,
            matches,
        };
    }

    /**
     * Scan the entire database for potential duplicate accounts using bucketed similarity comparisons.
     */
    public static async scanAllDuplicates(): Promise<DuplicateCluster[]> {
        // 1. Fetch only necessary lightweight fields
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                birthDate: true,
                gender: true,
                eloPoints: true,
                currentLevel: true,
                licenseId: true,
                canLogin: true,
                accountStatus: true,
                isSuperAdmin: true,
                emailVerified: true,
                passwordHash: true,
            },
            orderBy: { lastName: 'asc' },
        });

        if (users.length === 0) {
            return [];
        }

        // 2. Build index buckets (by last name prefix, first name prefix, birth year, email, and licenseId)
        const candidatePairs = new Map<string, [typeof users[0], typeof users[0]]>();

        const addPair = (u1: typeof users[0], u2: typeof users[0]) => {
            if (u1.id === u2.id) return;
            const key = [u1.id, u2.id].sort().join(':');
            if (!candidatePairs.has(key)) {
                candidatePairs.set(key, [u1, u2]);
            }
        };

        const lastNameMap = new Map<string, typeof users>();
        const firstNameMap = new Map<string, typeof users>();
        const birthYearMap = new Map<number, typeof users>();
        const licenseMap = new Map<string, typeof users>();

        for (const u of users) {
            const lnNorm = normalizeString(u.lastName).slice(0, 3);
            const fnNorm = normalizeString(u.firstName).slice(0, 3);

            if (lnNorm) {
                const list = lastNameMap.get(lnNorm) || [];
                list.push(u);
                lastNameMap.set(lnNorm, list);
            }
            if (fnNorm) {
                const list = firstNameMap.get(fnNorm) || [];
                list.push(u);
                firstNameMap.set(fnNorm, list);
            }
            if (u.birthDate) {
                const y = new Date(u.birthDate).getUTCFullYear();
                if (!isNaN(y)) {
                    const list = birthYearMap.get(y) || [];
                    list.push(u);
                    birthYearMap.set(y, list);
                }
            }
            if (u.licenseId) {
                const licNorm = normalizeString(u.licenseId);
                if (licNorm) {
                    const list = licenseMap.get(licNorm) || [];
                    list.push(u);
                    licenseMap.set(licNorm, list);
                }
            }
        }

        // Collect pairs with potential similarity from buckets
        const processBucket = (bucket: typeof users) => {
            if (bucket.length <= 1) return;
            for (let i = 0; i < bucket.length; i++) {
                for (let j = i + 1; j < bucket.length; j++) {
                    addPair(bucket[i], bucket[j]);
                }
            }
        };

        lastNameMap.forEach(processBucket);
        firstNameMap.forEach(processBucket);
        birthYearMap.forEach(processBucket);
        licenseMap.forEach(processBucket);

        // 3. Evaluate similarity only on candidate pairs
        const matchedClusters: {
            clusterId: string;
            similarity: number;
            confidence: 'HIGH' | 'MEDIUM';
            reasons: DuplicateMatchReason[];
            u1: typeof users[0];
            u2: typeof users[0];
        }[] = [];

        const matchedUserIds = new Set<string>();

        candidatePairs.forEach(([u1, u2], pairKey) => {
            const evalResult = this.evaluateSimilarity(
                {
                    firstName: u1.firstName,
                    lastName: u1.lastName,
                    birthDate: u1.birthDate,
                    email: u1.email,
                    licenseId: u1.licenseId,
                },
                {
                    firstName: u2.firstName,
                    lastName: u2.lastName,
                    birthDate: u2.birthDate,
                    email: u2.email,
                    licenseId: u2.licenseId,
                }
            );

            if (evalResult.similarity >= 70) {
                matchedClusters.push({
                    clusterId: pairKey,
                    similarity: evalResult.similarity,
                    confidence: evalResult.confidence as 'HIGH' | 'MEDIUM',
                    reasons: evalResult.reasons,
                    u1,
                    u2,
                });
                matchedUserIds.add(u1.id);
                matchedUserIds.add(u2.id);
            }
        });

        if (matchedClusters.length === 0) {
            return [];
        }

        // 4. Fetch relations only for the matched duplicate users
        const userDetails = await prisma.user.findMany({
            where: { id: { in: Array.from(matchedUserIds) } },
            select: {
                id: true,
                clubRoles: {
                    select: {
                        id: true,
                        role: true,
                        club: { select: { id: true, name: true, code: true } },
                    },
                },
                associationRoles: {
                    select: {
                        id: true,
                        role: true,
                        association: { select: { id: true, name: true, shortName: true, code: true } },
                    },
                },
                licenses: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        club: { select: { id: true, name: true } },
                    },
                },
            },
        });

        const detailsMap = new Map(userDetails.map((d) => [d.id, d]));

        const clusters: DuplicateCluster[] = matchedClusters.map((c) => {
            const { passwordHash: _p1, ...safeU1 } = c.u1;
            const { passwordHash: _p2, ...safeU2 } = c.u2;

            const d1 = detailsMap.get(c.u1.id);
            const d2 = detailsMap.get(c.u2.id);

            return {
                clusterId: c.clusterId,
                similarity: c.similarity,
                confidence: c.confidence,
                reasons: c.reasons,
                users: [
                    {
                        ...safeU1,
                        clubRoles: d1?.clubRoles || [],
                        associationRoles: d1?.associationRoles || [],
                        licenses: d1?.licenses || [],
                    },
                    {
                        ...safeU2,
                        clubRoles: d2?.clubRoles || [],
                        associationRoles: d2?.associationRoles || [],
                        licenses: d2?.licenses || [],
                    },
                ],
            };
        });

        // Sort clusters by similarity descending
        clusters.sort((a, b) => b.similarity - a.similarity);
        return clusters;
    }

    /**
     * Merge duplicate user into primary user account.
     */
    public static async mergeDuplicateUsers(
        req: any,
        primaryUserId: string,
        duplicateUserId: string,
        keepDuplicateEmailIfUnset: boolean = true
    ): Promise<{ success: boolean; mergedUser: any }> {
        if (primaryUserId === duplicateUserId) {
            throw new Error('Cannot merge an account with itself.');
        }

        const primaryUser = await prisma.user.findUnique({
            where: { id: primaryUserId },
            include: {
                licenses: true,
                clubRoles: true,
                associationRoles: true,
            },
        });

        const duplicateUser = await prisma.user.findUnique({
            where: { id: duplicateUserId },
            include: {
                licenses: true,
                clubRoles: true,
                associationRoles: true,
                teamMemberships: true,
                courseAttendances: true,
            },
        });

        if (!primaryUser || !duplicateUser) {
            throw new Error('One or both user accounts were not found.');
        }

        if (duplicateUser.isSuperAdmin && !primaryUser.isSuperAdmin) {
            throw new Error('Cannot merge a Super Administrator account into a non-superadmin account.');
        }

        // Perform merge in transaction
        await prisma.$transaction(async (tx) => {
            // 1. Reassign or merge Licenses
            for (const dupLicense of duplicateUser.licenses) {
                const existingLicense = await tx.license.findFirst({
                    where: {
                        userId: primaryUserId,
                        seasonId: dupLicense.seasonId,
                        type: dupLicense.type,
                    },
                });

                if (existingLicense) {
                    // Delete duplicate's conflicting license
                    await tx.license.delete({ where: { id: dupLicense.id } });
                } else {
                    // Transfer license to primary user
                    await tx.license.update({
                        where: { id: dupLicense.id },
                        data: { userId: primaryUserId },
                    });
                }
            }

            // 2. Reassign Club Roles
            for (const role of duplicateUser.clubRoles) {
                const existing = await tx.userClubRole.findFirst({
                    where: { userId: primaryUserId, clubId: role.clubId, role: role.role },
                });
                if (!existing) {
                    await tx.userClubRole.update({
                        where: { id: role.id },
                        data: { userId: primaryUserId },
                    });
                } else {
                    await tx.userClubRole.delete({ where: { id: role.id } });
                }
            }

            // 3. Reassign Association Roles
            for (const role of duplicateUser.associationRoles) {
                const existing = await tx.userAssociationRole.findFirst({
                    where: { userId: primaryUserId, associationId: role.associationId, role: role.role },
                });
                if (!existing) {
                    await tx.userAssociationRole.update({
                        where: { id: role.id },
                        data: { userId: primaryUserId },
                    });
                } else {
                    await tx.userAssociationRole.delete({ where: { id: role.id } });
                }
            }

            // 4. Reassign Match Participants
            await tx.matchParticipant.updateMany({
                where: { userId: duplicateUserId },
                data: { userId: primaryUserId },
            });

            // 5. Reassign Team Memberships
            for (const tm of duplicateUser.teamMemberships) {
                const existing = await tx.teamMember.findFirst({
                    where: { userId: primaryUserId, teamId: tm.teamId },
                });
                if (!existing) {
                    await tx.teamMember.update({
                        where: { id: tm.id },
                        data: { userId: primaryUserId },
                    });
                } else {
                    await tx.teamMember.delete({ where: { id: tm.id } });
                }
            }

            // 6. Reassign Course Attendances
            for (const ca of duplicateUser.courseAttendances) {
                const existing = await tx.courseAttendance.findFirst({
                    where: { userId: primaryUserId, courseId: ca.courseId },
                });
                if (!existing) {
                    await tx.courseAttendance.update({
                        where: { id: ca.id },
                        data: { userId: primaryUserId },
                    });
                } else {
                    await tx.courseAttendance.delete({ where: { id: ca.id } });
                }
            }

            // 7. Reassign Notice Dismissals
            await tx.noticeDismissal.deleteMany({ where: { userId: duplicateUserId } });

            // 8. Update Primary user missing fields from duplicate user
            const updateData: any = {};
            if (!primaryUser.birthDate && duplicateUser.birthDate) {
                updateData.birthDate = duplicateUser.birthDate;
            }
            if (!primaryUser.phone && duplicateUser.phone) {
                updateData.phone = duplicateUser.phone;
            }
            if (!primaryUser.street && duplicateUser.street) {
                updateData.street = duplicateUser.street;
            }
            if (!primaryUser.city && duplicateUser.city) {
                updateData.city = duplicateUser.city;
            }
            if (!primaryUser.postalCode && duplicateUser.postalCode) {
                updateData.postalCode = duplicateUser.postalCode;
            }
            if (!primaryUser.gender && duplicateUser.gender) {
                updateData.gender = duplicateUser.gender;
            }
            if (!primaryUser.licenseId && duplicateUser.licenseId) {
                updateData.licenseId = duplicateUser.licenseId;
            }
            if (!primaryUser.email && duplicateUser.email && keepDuplicateEmailIfUnset) {
                updateData.email = duplicateUser.email;
            }
            if (duplicateUser.eloPoints > primaryUser.eloPoints && primaryUser.eloPoints === 1000) {
                updateData.eloPoints = duplicateUser.eloPoints;
                updateData.currentLevel = duplicateUser.currentLevel;
            }

            if (Object.keys(updateData).length > 0) {
                await tx.user.update({
                    where: { id: primaryUserId },
                    data: updateData,
                });
            }

            // 9. Delete duplicate user
            await tx.user.delete({
                where: { id: duplicateUserId },
            });
        });

        // Audit log
        await AuditService.record({
            req,
            userId: req.user?.id || primaryUserId,
            userEmail: req.user?.email || primaryUser.email || undefined,
            userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : `${primaryUser.firstName} ${primaryUser.lastName}`,
            action: 'USER_DUPLICATE_MERGED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'User',
            entityId: primaryUserId,
            description: `Merged duplicate user ${duplicateUser.firstName} ${duplicateUser.lastName} (${duplicateUser.id}) into primary user ${primaryUser.firstName} ${primaryUser.lastName} (${primaryUserId})`,
            status: 'SUCCESS',
            metadata: {
                primaryUserId,
                duplicateUserId,
                duplicateEmail: duplicateUser.email,
            },
        });

        const mergedUser = await prisma.user.findUnique({
            where: { id: primaryUserId },
            include: {
                licenses: { include: { club: true } },
                clubRoles: { include: { club: true } },
                associationRoles: { include: { association: true } },
            },
        });

        return { success: true, mergedUser };
    }
}
