import { prisma } from '../config/prisma';
import { VisibilityScope, PrivacyRuleConfig } from '@areena/shared';

export interface PrivacyContext {
    viewerUserId?: string;
    isSuperAdmin?: boolean;
    isFederationMember?: boolean;
    isTournamentAdmin?: boolean;
}

export class PrivacyService {
    /**
     * Retrieves the privacy rule configuration for the top-level association
     */
    public static async getAssociationPrivacyRules(associationId?: string): Promise<PrivacyRuleConfig> {
        try {
            const assoc = associationId
                ? await prisma.association.findUnique({ where: { id: associationId } })
                : await prisma.association.findFirst({ where: { isTopLevel: true } }) || await prisma.association.findFirst();

            const rules = (assoc?.rules as any) || {};
            const privacy = rules.privacy || {};

            return {
                competitionsVisibility: (privacy.competitionsVisibility as VisibilityScope) || 'PUBLIC',
                clubsVisibility: (privacy.clubsVisibility as VisibilityScope) || 'PUBLIC',
                peopleVisibility: (privacy.peopleVisibility as VisibilityScope) || 'FEDERATION_ONLY',
                allowPlayerAnonymization: privacy.allowPlayerAnonymization !== false,
                maskMinorNamesByDefault: privacy.maskMinorNamesByDefault === true,
            };
        } catch (err) {
            console.error('Failed to get association privacy rules:', err);
            return {
                competitionsVisibility: 'PUBLIC',
                clubsVisibility: 'PUBLIC',
                peopleVisibility: 'FEDERATION_ONLY',
                allowPlayerAnonymization: true,
                maskMinorNamesByDefault: false,
            };
        }
    }

    /**
     * Checks if a request has permission to access a specific resource directory
     */
    public static async checkDirectoryAccess(
        scope: VisibilityScope,
        ctx: PrivacyContext
    ): Promise<{ allowed: boolean; reason?: string }> {
        if (scope === 'PUBLIC') {
            return { allowed: true };
        }

        if (ctx.isSuperAdmin) {
            return { allowed: true };
        }

        if (!ctx.viewerUserId) {
            return {
                allowed: false,
                reason: 'Authentication required. Please log in to view this directory.',
            };
        }

        if (scope === 'AUTHENTICATED') {
            return { allowed: true };
        }

        if (scope === 'FEDERATION_ONLY') {
            if (ctx.isFederationMember) {
                return { allowed: true };
            }
            return {
                allowed: false,
                reason: 'Access restricted to accepted/licensed federation members.',
            };
        }

        return { allowed: true };
    }

    /**
     * Sanitizes a player/user profile based on their privacy choices and the viewer's permission
     */
    public static sanitizePlayerProfile(player: any, ctx: PrivacyContext = {}): any {
        if (!player) return null;

        // 1. Unmasked for self, super-admins, or tournament organizers/referees
        const isSelf = ctx.viewerUserId && ctx.viewerUserId === player.id;
        if (isSelf || ctx.isSuperAdmin || ctx.isTournamentAdmin) {
            return player;
        }

        const isPublicHidden = player.isPubliclyHidden === true;
        const choice = player.displayNameChoice || 'FULL_NAME';

        // 2. Hide sensitive contact details for all standard public consumers
        const sanitized: any = {
            ...player,
            phone: undefined,
            street: undefined,
            postalCode: undefined,
        };

        if (player.hideContactInfo && !isSelf) {
            sanitized.email = undefined;
        }

        if (player.hideEloRanking && !isSelf) {
            sanitized.eloPoints = undefined;
            sanitized.rank = undefined;
        }

        // 3. Name masking
        if (isPublicHidden || choice === 'ANONYMOUS') {
            sanitized.firstName = 'Anonymous';
            sanitized.lastName = 'Player';
            sanitized.avatarUrl = undefined;
            sanitized.licenseId = undefined;
            sanitized.email = undefined;
            return sanitized;
        }

        if (choice === 'INITIALS') {
            const firstInitial = player.firstName ? `${player.firstName.charAt(0)}.` : '';
            const lastInitial = player.lastName ? `${player.lastName.charAt(0)}.` : '';
            sanitized.firstName = firstInitial;
            sanitized.lastName = lastInitial;
            sanitized.avatarUrl = undefined;
            sanitized.email = undefined;
            return sanitized;
        }

        return sanitized;
    }
}