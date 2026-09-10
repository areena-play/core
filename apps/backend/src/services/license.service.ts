import { prisma } from '../config/prisma';
import { LicenseType, LicenseStatus, LicenseScope, PlayerEligibilityResult } from '@areena/shared';
import { redisPub } from '../config/redis';
import { DistributedLockService } from './distributedLock.service';

export class LicenseService {
    /**
     * Generates a unique license ID based on the association's configurable template
     * protected by a PostgreSQL transaction advisory lock and atomic counter update.
     * e.g. "{regionDigit}{year2}{counter3}" -> "126001"
     */
    static async generateLicenseId(associationId: string, tx?: any): Promise<string> {
        const executeIncrement = async (client: any) => {
            const association = await client.association.findUnique({
                where: { id: associationId },
            });

            if (!association) {
                throw new Error(`Association with ID ${associationId} not found`);
            }

            // Atomically increment counter within the transaction
            const updatedAssoc = await client.association.update({
                where: { id: associationId },
                data: { licenseCounter: { increment: 1 } },
            });

            const now = new Date();
            const year4 = now.getFullYear().toString();
            const year2 = year4.slice(-2);
            const regionDigit = association.regionDigit ? association.regionDigit.toString() : '1';
            const regionCode = association.code || 'CH';
            const counter = updatedAssoc.licenseCounter;
            const counter3 = counter.toString().padStart(3, '0');
            const counter4 = counter.toString().padStart(4, '0');
            const counter5 = counter.toString().padStart(5, '0');

            let template = association.licenseIdTemplate || '{regionDigit}{year2}{counter3}';
            let licenseId = template
                .replace(/\{regionDigit\}/g, regionDigit)
                .replace(/\{regionCode\}/g, regionCode)
                .replace(/\{year2\}/g, year2)
                .replace(/\{year4\}/g, year4)
                .replace(/\{counter3\}/g, counter3)
                .replace(/\{counter4\}/g, counter4)
                .replace(/\{counter5\}/g, counter5);

            // Ensure uniqueness fallback
            const existing = await client.user.findUnique({ where: { licenseId } });
            if (existing) {
                licenseId = `${licenseId}-${Math.floor(Math.random() * 899 + 100)}`;
            }

            return licenseId;
        };

        if (tx) {
            return await executeIncrement(tx);
        }

        return await DistributedLockService.withLock(
            `association:${associationId}:license-counter`,
            async (transactionClient) => {
                return await executeIncrement(transactionClient);
            },
        );
    }

    /**
     * Applies for a license with transactional validation and PostgreSQL advisory lock protection.
     * Enforces single/multi-club rules, female league second-club exceptions, and tournament passes.
     */
    static async applyForLicense(data: {
        userId: string;
        type: LicenseType;
        associationId: string;
        clubId?: string | null;
        seasonId?: string | null;
        tournamentId?: string | null;
        isSecondaryClubLicense?: boolean;
        scope?: LicenseScope | string;
        validFrom?: Date;
        validUntil?: Date;
        appliedByUserId: string;
        notes?: string;
    }) {
        const { license, user, autoApproved } = await DistributedLockService.withLock(
            `user:${data.userId}:license-apply`,
            async (tx) => {
                const user = await tx.user.findUnique({ where: { id: data.userId } });
                if (!user) {
                    throw new Error('User not found');
                }

                const isSecondary = data.isSecondaryClubLicense || false;
                const scope = (data.scope as LicenseScope) || (isSecondary ? LicenseScope.LEAGUE_ONLY : LicenseScope.ALL);

                // 1. Regular Player License & Club limits
                if (data.type === LicenseType.PLAYER_REGULAR) {
                    if (!data.clubId && !data.tournamentId) {
                        throw new Error('Regular player license must be attached to a club');
                    }

                    if (data.seasonId) {
                        const existingLicenses = await tx.license.findMany({
                            where: {
                                userId: data.userId,
                                type: LicenseType.PLAYER_REGULAR,
                                seasonId: data.seasonId,
                                status: {
                                    in: [
                                        LicenseStatus.APPROVED,
                                        LicenseStatus.PENDING_CLUB,
                                        LicenseStatus.PENDING_ASSOCIATION,
                                    ],
                                },
                            },
                        });

                        const primaryLicense = existingLicenses.find((l: any) => !l.isSecondaryClubLicense);
                        const secondaryLicense = existingLicenses.find((l: any) => l.isSecondaryClubLicense);

                        if (!isSecondary && primaryLicense) {
                            throw new Error(
                                'Player already has an active or pending primary license for this season. Only 1 primary club license is permitted.',
                            );
                        }

                        if (isSecondary) {
                            if (user.gender !== 'FEMALE') {
                                throw new Error(
                                    'Secondary club licenses are only permitted for female players participating in league play.',
                                );
                            }
                            if (secondaryLicense) {
                                throw new Error(
                                    'Player already has a secondary league license for this season.',
                                );
                            }
                        }
                    }
                }

                // Determine validity dates
                let validFrom = data.validFrom || new Date();
                let validUntil = data.validUntil;

                if (!validUntil) {
                    if (data.tournamentId) {
                        const tournament = await tx.competition.findUnique({ where: { id: data.tournamentId } });
                        if (tournament) {
                            validFrom = new Date(tournament.startDate);
                            validUntil = new Date(tournament.endDate);
                        }
                    } else if (data.seasonId) {
                        const season = await tx.season.findUnique({ where: { id: data.seasonId } });
                        if (season) {
                            validUntil = season.endDate;
                        }
                    }
                    if (!validUntil) {
                        // Default 1 year from now
                        validUntil = new Date();
                        validUntil.setFullYear(validUntil.getFullYear() + 1);
                    }
                }

                // 2. Check Auto-approval criteria
                let initialStatus: LicenseStatus = LicenseStatus.PENDING_CLUB;
                let autoApproved = false;

                if (data.type === LicenseType.PLAYER_TCARD || data.tournamentId) {
                    const association = await tx.association.findUnique({ where: { id: data.associationId } });
                    const rules = (association?.rules as any) || {};
                    const autoApproveDomestic = rules.autoApproveDomesticTCards !== false; // default true

                    if (
                        autoApproveDomestic &&
                        user.country.toLowerCase() === (association?.code === 'CH' ? 'switzerland' : 'switzerland')
                    ) {
                        initialStatus = LicenseStatus.APPROVED;
                        autoApproved = true;
                    } else {
                        initialStatus = LicenseStatus.PENDING_ASSOCIATION;
                    }
                } else if (data.type === LicenseType.COACH || data.type === LicenseType.REFEREE) {
                    initialStatus = LicenseStatus.PENDING_ASSOCIATION;
                } else if (data.type === LicenseType.PLAYER_REGULAR) {
                    if (data.appliedByUserId !== data.userId) {
                        initialStatus = LicenseStatus.PENDING_ASSOCIATION;
                    } else {
                        initialStatus = LicenseStatus.PENDING_CLUB;
                    }
                }

                // Create license
                const createdLicense = await tx.license.create({
                    data: {
                        userId: data.userId,
                        type: data.type,
                        status: initialStatus,
                        clubId: data.clubId || null,
                        associationId: data.associationId,
                        seasonId: data.seasonId || null,
                        tournamentId: data.tournamentId || null,
                        isSecondaryClubLicense: isSecondary,
                        scope: scope === LicenseScope.LEAGUE_ONLY ? 'LEAGUE_ONLY' : 'ALL',
                        validFrom,
                        validUntil,
                        autoApproved,
                        appliedByUserId: data.appliedByUserId,
                        metadata: data.notes ? { notes: data.notes } : {},
                    },
                    include: {
                        user: true,
                        club: true,
                        association: true,
                        tournament: true,
                    },
                });

                // If auto-approved and user doesn't have a permanent licenseId yet, generate one
                if (autoApproved && !user.licenseId) {
                    const newLicenseId = await this.generateLicenseId(data.associationId, tx);
                    await tx.user.update({
                        where: { id: user.id },
                        data: { licenseId: newLicenseId },
                    });
                }

                return { license: createdLicense, user, autoApproved };
            },
        );

        // Publish event after transaction commits
        try {
            await redisPub.publish(
                'areena:licenses',
                JSON.stringify({
                    event: 'LICENSE_APPLIED',
                    licenseId: license.id,
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    type: license.type,
                    status: license.status,
                    autoApproved,
                }),
            );
        } catch {}

        return license;
    }

    /**
     * Approves or rejects a license within a PostgreSQL transaction advisory lock.
     * Generates a permanent unique licenseId upon the user's very first approved license.
     */
    static async processLicenseApproval(data: {
        licenseId: string;
        approvedByUserId: string;
        approved: boolean;
        rejectionReason?: string;
    }) {
        const updatedLicense = await DistributedLockService.withLock(
            `license:${data.licenseId}:approval`,
            async (tx) => {
                const license = await tx.license.findUnique({
                    where: { id: data.licenseId },
                    include: { user: true, association: true },
                });

                if (!license) {
                    throw new Error('License not found');
                }

                const nextStatus = data.approved ? LicenseStatus.APPROVED : LicenseStatus.REJECTED;

                const updated = await tx.license.update({
                    where: { id: data.licenseId },
                    data: {
                        status: nextStatus,
                        approvedByUserId: data.approvedByUserId,
                        rejectionReason: data.approved ? null : data.rejectionReason,
                    },
                    include: { user: true, club: true, association: true, tournament: true },
                });

                // If approved and user doesn't have a license ID yet, assign one atomically
                if (data.approved && !license.user.licenseId) {
                    const topAssociation =
                        (await tx.association.findFirst({
                            where: { isTopLevel: true },
                        })) || license.association;

                    const newLicenseId = await this.generateLicenseId(topAssociation.id, tx);
                    await tx.user.update({
                        where: { id: license.userId },
                        data: { licenseId: newLicenseId },
                    });
                }

                return updated;
            },
        );

        // Publish event after commit
        try {
            await redisPub.publish(
                'areena:licenses',
                JSON.stringify({
                    event: 'LICENSE_STATUS_UPDATED',
                    licenseId: updatedLicense.id,
                    userId: updatedLicense.userId,
                    status: updatedLicense.status,
                    approved: data.approved,
                }),
            );
        } catch {}

        return updatedLicense;
    }

    /**
     * Validates whether a player holds an active, eligible license for a specific competition on a given date.
     */
    static async checkPlayerEligibility(
        userId: string,
        competitionId: string,
        matchDate: Date = new Date(),
    ): Promise<PlayerEligibilityResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                licenses: {
                    where: {
                        status: LicenseStatus.APPROVED,
                        validFrom: { lte: matchDate },
                        validUntil: { gte: matchDate },
                    },
                    include: { club: true },
                },
            },
        });

        if (!user) {
            return { eligible: false, reason: 'USER_NOT_FOUND' };
        }

        if (user.licenses.length === 0) {
            return { eligible: false, reason: 'NO_ACTIVE_LICENSE' };
        }

        const competition = await prisma.competition.findUnique({
            where: { id: competitionId },
        });

        if (!competition) {
            return { eligible: false, reason: 'COMPETITION_NOT_FOUND' };
        }

        // 1. Direct tournament pass match
        const tournamentPass = user.licenses.find((l) => l.tournamentId === competitionId);
        if (tournamentPass) {
            return { eligible: true, licenseUsed: tournamentPass };
        }

        // 2. League Match eligibility
        if (competition.type === 'LEAGUE') {
            // Allows primary licenses OR female league secondary licenses
            const leagueLicense = user.licenses.find(
                (l) => l.scope === 'ALL' || (l.scope === 'LEAGUE_ONLY' && user.gender === 'FEMALE'),
            );
            if (leagueLicense) {
                return { eligible: true, licenseUsed: leagueLicense };
            }
            return { eligible: false, reason: 'NO_VALID_LEAGUE_LICENSE' };
        }

        // 3. Regular Individual Tournament / Cup
        // Secondary league-only licenses are strictly not valid for regular open individual tournaments
        const openLicense = user.licenses.find((l) => l.scope === 'ALL');
        if (openLicense) {
            return { eligible: true, licenseUsed: openLicense };
        }

        return {
            eligible: false,
            reason: 'SECONDARY_LEAGUE_LICENSE_NOT_PERMITTED_IN_OPEN_TOURNAMENT',
        };
    }

    /**
     * Attests a refresher course attendance and extends coach/referee license validity.
     */
    static async attestCourseAttendance(data: {
        courseId: string;
        userId: string;
        instructorId: string;
        notes?: string;
    }) {
        return await DistributedLockService.withLock(`user:${data.userId}:course-attest`, async (tx) => {
            const course = await tx.refresherCourse.findUnique({
                where: { id: data.courseId },
            });

            if (!course) {
                throw new Error('Refresher course not found');
            }

            if (course.instructorId !== data.instructorId) {
                const instructorUser = await tx.user.findUnique({ where: { id: data.instructorId } });
                if (!instructorUser?.isSuperAdmin) {
                    throw new Error('Only the designated course instructor or super admin can attest attendance');
                }
            }

            const targetLicenseType =
                course.type === 'COACH_REFRESHER' ? LicenseType.COACH : LicenseType.REFEREE;

            const activeLicense = await tx.license.findFirst({
                where: {
                    userId: data.userId,
                    type: targetLicenseType,
                },
                orderBy: { validUntil: 'desc' },
            });

            const now = new Date();
            let newValidUntil = new Date(course.date);
            newValidUntil.setMonth(newValidUntil.getMonth() + course.validityExtensionMonths);

            if (activeLicense && activeLicense.validUntil > now) {
                const extended = new Date(activeLicense.validUntil);
                extended.setMonth(extended.getMonth() + course.validityExtensionMonths);
                if (extended > newValidUntil) {
                    newValidUntil = extended;
                }
            }

            let updatedLicense = null;
            if (activeLicense) {
                updatedLicense = await tx.license.update({
                    where: { id: activeLicense.id },
                    data: {
                        validUntil: newValidUntil,
                        status: LicenseStatus.APPROVED,
                    },
                });
            }

            const attendance = await tx.courseAttendance.upsert({
                where: {
                    courseId_userId: {
                        courseId: data.courseId,
                        userId: data.userId,
                    },
                },
                update: {
                    attested: true,
                    attestedAt: new Date(),
                    attestedByUserId: data.instructorId,
                    notes: data.notes,
                    licenseId: activeLicense?.id || null,
                },
                create: {
                    courseId: data.courseId,
                    userId: data.userId,
                    attested: true,
                    attestedAt: new Date(),
                    attestedByUserId: data.instructorId,
                    notes: data.notes,
                    licenseId: activeLicense?.id || null,
                },
                include: {
                    user: true,
                    course: true,
                },
            });

            return { attendance, updatedLicense };
        });
    }

    /**
     * Checks if a user's coach or referee license is active and refresher-compliant.
     */
    static async checkLicenseRefresherStatus(userId: string, licenseType: LicenseType) {
        const license = await prisma.license.findFirst({
            where: {
                userId,
                type: licenseType,
                status: LicenseStatus.APPROVED,
            },
            orderBy: { validUntil: 'desc' },
        });

        if (!license) {
            return { hasLicense: false, isValid: false, reason: 'No approved license found' };
        }

        const now = new Date();
        if (license.validUntil < now) {
            return {
                hasLicense: true,
                isValid: false,
                reason: 'License has expired - refresher course required',
                validUntil: license.validUntil,
            };
        }

        const daysUntilExpiry = Math.ceil((license.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            hasLicense: true,
            isValid: true,
            validUntil: license.validUntil,
            daysUntilExpiry,
            warning: daysUntilExpiry <= 60 ? `License expires in ${daysUntilExpiry} days` : null,
        };
    }
}
