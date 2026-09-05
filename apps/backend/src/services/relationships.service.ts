import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

export type RelationshipType = 'PARENT_GUARDIAN' | 'CLUB_COACH' | 'TEAM_CAPTAIN' | 'DELEGATED_COMPANION';
export type RelationshipPermission = 'FULL_MANAGEMENT' | 'TOURNAMENT_ONLY' | 'VIEW_AND_ALERTS_ONLY';

export interface CreateDependentData {
    firstName: string;
    lastName: string;
    birthDate?: string | Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    clubId?: string;
    emergencyPhone?: string;
}

export class RelationshipsService {
    /**
     * Get all managed profiles (dependents/kids) for a given manager user
     */
    static async getManagedProfiles(managerUserId: string) {
        const relationships = await (prisma as any).userRelationship.findMany({
            where: { managerUserId },
            include: {
                managed: {
                    include: {
                        licenses: {
                            where: { status: 'APPROVED' },
                            include: { association: true, season: true },
                        },
                        clubRoles: {
                            include: { club: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return relationships.map((rel: any) => ({
            relationshipId: rel.id,
            relationshipType: rel.type,
            permission: rel.permission,
            isEmergencyContact: rel.isEmergencyContact,
            emergencyPhone: rel.emergencyPhone,
            player: {
                id: rel.managed.id,
                firstName: rel.managed.firstName,
                lastName: rel.managed.lastName,
                fullName: `${rel.managed.firstName} ${rel.managed.lastName}`,
                email: rel.managed.email,
                birthDate: rel.managed.birthDate,
                gender: rel.managed.gender,
                licenseId: rel.managed.licenseId,
                eloPoints: rel.managed.eloPoints,
                accountStatus: rel.managed.accountStatus,
                canLogin: rel.managed.canLogin,
                avatarUrl: rel.managed.avatarUrl,
                licenses: rel.managed.licenses,
                clubRoles: rel.managed.clubRoles,
            },
        }));
    }

    /**
     * Get all co-guardians and managers linked to a specific player
     */
    static async getGuardians(managedUserId: string) {
        const relationships = await (prisma as any).userRelationship.findMany({
            where: { managedUserId },
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return relationships.map((rel: any) => ({
            id: rel.id,
            type: rel.type,
            permission: rel.permission,
            isEmergencyContact: rel.isEmergencyContact,
            emergencyPhone: rel.emergencyPhone,
            guardian: rel.manager,
        }));
    }

    /**
     * Create a new managed profile (no password/credentials) and establish guardianship
     */
    static async createManagedDependent(
        managerUserId: string,
        data: CreateDependentData,
        type: RelationshipType = 'PARENT_GUARDIAN',
        permission: RelationshipPermission = 'FULL_MANAGEMENT'
    ) {
        if (!data.firstName || !data.lastName) {
            throw new Error('First name and last name are required');
        }

        const manager = await prisma.user.findUnique({
            where: { id: managerUserId },
        });
        if (!manager) {
            throw new Error('Manager user not found');
        }

        // Create the managed user without login credentials
        const createdPlayer = await (prisma.user.create as any)({
            data: {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                gender: data.gender || undefined,
                accountStatus: 'MANAGED',
                canLogin: false,
                eloPoints: 1000,
                country: manager.country || 'Switzerland',
                phone: data.emergencyPhone || manager.phone || '',
                street: manager.street || '',
                postalCode: manager.postalCode || '',
                city: manager.city || '',
            },
        });

        // Link manager to the newly created player
        const relationship = await (prisma as any).userRelationship.create({
            data: {
                managerUserId,
                managedUserId: createdPlayer.id,
                type,
                permission,
                isEmergencyContact: true,
                emergencyPhone: data.emergencyPhone || manager.phone || '',
            },
        });

        // Optionally associate player with a club
        if (data.clubId) {
            await (prisma as any).userClubRole.create({
                data: {
                    userId: createdPlayer.id,
                    clubId: data.clubId,
                    role: 'MEMBER',
                },
            }).catch(() => {});
        }

        return {
            player: createdPlayer,
            relationship,
        };
    }

    /**
     * Add a co-guardian / co-parent to a managed player
     */
    static async addCoGuardian(
        actorUserId: string,
        managedUserId: string,
        coGuardianIdentifier: string,
        type: RelationshipType = 'PARENT_GUARDIAN',
        permission: RelationshipPermission = 'FULL_MANAGEMENT',
        emergencyPhone?: string
    ) {
        // Verify that actor has management rights over the player
        const hasRights = await this.canManagePlayer(actorUserId, managedUserId, 'FULL_MANAGEMENT');
        if (!hasRights) {
            throw new Error('Not authorized to add guardians for this player');
        }

        // Find co-guardian by email or ID or phone
        const coGuardian = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: coGuardianIdentifier },
                    { email: coGuardianIdentifier.toLowerCase() },
                    { phone: coGuardianIdentifier },
                ],
            },
        });

        if (!coGuardian) {
            throw new Error(`User '${coGuardianIdentifier}' was not found. They must first create an AREENA account.`);
        }

        if (coGuardian.id === managedUserId) {
            throw new Error('Player cannot be their own guardian');
        }

        return (prisma as any).userRelationship.upsert({
            where: {
                managerUserId_managedUserId: {
                    managerUserId: coGuardian.id,
                    managedUserId,
                },
            },
            create: {
                managerUserId: coGuardian.id,
                managedUserId,
                type,
                permission,
                isEmergencyContact: !!emergencyPhone,
                emergencyPhone: emergencyPhone || coGuardian.phone || undefined,
            },
            update: {
                type,
                permission,
                emergencyPhone: emergencyPhone || undefined,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Generate an invite token for a teenage player to claim their account and set up their own credentials
     */
    static async createClaimInvite(actorUserId: string, managedUserId: string) {
        const hasRights = await this.canManagePlayer(actorUserId, managedUserId, 'FULL_MANAGEMENT');
        if (!hasRights) {
            throw new Error('Not authorized to generate claim invite for this player');
        }

        const player = await prisma.user.findUnique({
            where: { id: managedUserId },
        });
        if (!player) throw new Error('Player not found');

        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await (prisma.user.update as any)({
            where: { id: managedUserId },
            data: {
                claimToken: token,
                claimTokenExpires: expires,
                accountStatus: 'INVITED',
            },
        });

        return {
            claimToken: token,
            claimUrl: `/auth/claim?token=${token}`,
            expiresAt: expires,
            player: {
                id: player.id,
                name: `${player.firstName} ${player.lastName}`,
            },
        };
    }

    /**
     * Claim account: teenage player accepts invite, sets email & password -> account becomes ACTIVE
     */
    static async claimAccount(claimToken: string, email: string, passwordPlain: string) {
        if (!claimToken || !email || !passwordPlain) {
            throw new Error('Claim token, email, and password are required');
        }

        const player = await (prisma.user.findFirst as any)({
            where: {
                claimToken,
                claimTokenExpires: { gt: new Date() },
            },
        });

        if (!player) {
            throw new Error('Claim invite token is invalid or has expired');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingEmail = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                id: { not: player.id },
            },
        });

        if (existingEmail) {
            throw new Error('This email address is already in use by another account');
        }

        const passwordHash = await bcrypt.hash(passwordPlain, 10);

        const updated = await (prisma.user.update as any)({
            where: { id: player.id },
            data: {
                email: normalizedEmail,
                passwordHash,
                canLogin: true,
                accountStatus: 'ACTIVE',
                claimToken: null,
                claimTokenExpires: null,
                emailVerified: true,
            },
        });

        return updated;
    }

    /**
     * Remove a guardianship / delegation link
     */
    static async removeRelationship(actorUserId: string, relationshipId: string) {
        const rel = await (prisma as any).userRelationship.findUnique({
            where: { id: relationshipId },
        });
        if (!rel) throw new Error('Relationship record not found');

        // Actor must either be the manager in question or have full management over the target
        const isSelfManager = rel.managerUserId === actorUserId;
        const hasRights = await this.canManagePlayer(actorUserId, rel.managedUserId, 'FULL_MANAGEMENT');

        if (!isSelfManager && !hasRights) {
            throw new Error('Not authorized to remove this relationship');
        }

        await (prisma as any).userRelationship.delete({
            where: { id: relationshipId },
        });

        return { success: true };
    }

    /**
     * Centralized Permission Resolver: Determines if an actor has authority over a target player
     */
    static async canManagePlayer(
        actorUserId: string,
        targetPlayerId: string,
        action: 'FULL_MANAGEMENT' | 'TOURNAMENT_ONLY' | 'VIEW_AND_ALERTS_ONLY' = 'TOURNAMENT_ONLY'
    ): Promise<boolean> {
        // 1. Self-management
        if (actorUserId === targetPlayerId) return true;

        // 2. Direct Guardianship (Parent, Guardian, Coach)
        const directRel = await (prisma as any).userRelationship.findFirst({
            where: {
                managerUserId: actorUserId,
                managedUserId: targetPlayerId,
            },
        });
        if (directRel) {
            if (action === 'FULL_MANAGEMENT') return directRel.permission === 'FULL_MANAGEMENT';
            return true;
        }

        // 3. Functional Club Roles (Technical Director, Junior Coach, President, Admin)
        const playerClubs = await (prisma as any).userClubRole.findMany({
            where: { userId: targetPlayerId },
            select: { clubId: true },
        });

        if (playerClubs.length > 0) {
            const clubIds = playerClubs.map((c: any) => c.clubId);
            const actorClubRole = await (prisma as any).userClubRole.findFirst({
                where: {
                    userId: actorUserId,
                    clubId: { in: clubIds },
                    role: {
                        in: [
                            'ADMIN',
                            'PRESIDENT',
                            'TECHNICAL_DIRECTOR',
                            'JUNIOR_COACH',
                            'COACH',
                        ],
                    },
                },
            });

            if (actorClubRole) {
                return true;
            }
        }

        // 4. On-Site Tournament Delegation (for active tournaments)
        const activeDelegation = await (prisma as any).teamCategoryRegistration.findFirst({
            where: {
                onSiteResponsibleUserId: actorUserId,
                team: {
                    members: {
                        some: { userId: targetPlayerId },
                    },
                },
            },
        });

        if (activeDelegation) return true;

        return false;
    }

    /**
     * Get all recipients (athlete + co-guardians + coach) who should receive alerts for a given athlete
     */
    static async getAlertRecipientsForPlayer(playerId: string): Promise<string[]> {
        const recipients = new Set<string>();

        const player = await (prisma.user.findUnique as any)({
            where: { id: playerId },
            select: { id: true, canLogin: true, accountStatus: true },
        });

        // Add athlete if active
        if (player && player.canLogin) {
            recipients.add(player.id);
        }

        // Add all active guardians/managers
        const guardians = await (prisma as any).userRelationship.findMany({
            where: { managedUserId: playerId },
            select: { managerUserId: true },
        });

        guardians.forEach((g: any) => recipients.add(g.managerUserId));

        // Add on-site tournament responsible if any active tournament registration exists
        const delegation = await (prisma as any).teamCategoryRegistration.findFirst({
            where: {
                team: { members: { some: { userId: playerId } } },
                onSiteResponsibleUserId: { not: null },
            },
            select: { onSiteResponsibleUserId: true },
        });

        if (delegation?.onSiteResponsibleUserId) {
            recipients.add(delegation.onSiteResponsibleUserId);
        }

        return Array.from(recipients);
    }
}
