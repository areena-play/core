export enum RatingTriggerReason {
    MONTHLY_SCHEDULE = 'MONTHLY_SCHEDULE',
    BI_ANNUAL_LEVEL = 'BI_ANNUAL_LEVEL',
    MATCH_EVENT = 'MATCH_EVENT',
    INITIAL_PROVISIONAL = 'INITIAL_PROVISIONAL',
    MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export interface RatingSnapshotDto {
    id: string;
    userId: string;
    associationId?: string | null;
    elo: number;
    level: string;
    rankOverall?: number | null;
    rankGender?: number | null;
    rankAgeCategory?: number | null;
    effectiveFrom: string;
    effectiveTo?: string | null;
    triggerReason: RatingTriggerReason;
    createdAt: string;
    user?: any;
}

export interface MatchParticipantDto {
    id: string;
    matchId: string;
    userId: string;
    ratingSnapshotId?: string | null;
    ratingSnapshot?: RatingSnapshotDto | null;
    clubIdAtTime?: string | null;
    licenseIdUsed?: string | null;
    teamId?: string | null;
    side: 'HOME' | 'AWAY';
    position?: number;
    user?: any;
}

export interface PlayerEligibilityResult {
    eligible: boolean;
    reason?: string;
    licenseUsed?: any;
}

export interface LevelTierDefinition {
    id?: string;
    order: number;
    category: string;
    level: string;
    minElo: number;
    maxElo: number;
    description: string;
    leagueEligibility: string;
    color?: string;
    badgeColor?: string;
}

export const ELO_TIERS_DATA: LevelTierDefinition[] = [
    // Category A - National Elite
    { id: 'tier_a20', order: 1, category: 'A - National Elite', level: 'A20', minElo: 2200, maxElo: 3000, description: 'National Champions, Olympic & World Tour Players', leagueEligibility: 'National League A (NLA)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { id: 'tier_a19', order: 2, category: 'A - National Elite', level: 'A19', minElo: 2100, maxElo: 2199, description: 'Top National League Competitors', leagueEligibility: 'National League A (NLA)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { id: 'tier_a18', order: 3, category: 'A - National Elite', level: 'A18', minElo: 2000, maxElo: 2099, description: 'National League & Top Regional Players', leagueEligibility: 'National League B (NLB)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { id: 'tier_a17', order: 4, category: 'A - National Elite', level: 'A17', minElo: 1900, maxElo: 1999, description: 'Semi-Professional & Elite Regional Competitors', leagueEligibility: 'National League B (NLB)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { id: 'tier_a16', order: 5, category: 'A - National Elite', level: 'A16', minElo: 1800, maxElo: 1899, description: 'High-Level 1st League Players', leagueEligibility: '1st League Interclub', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },

    // Category B - Expert
    { id: 'tier_b15', order: 6, category: 'B - Expert', level: 'B15', minElo: 1700, maxElo: 1799, description: 'Experienced 1st League Club Representatives', leagueEligibility: '1st / 2nd League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { id: 'tier_b14', order: 7, category: 'B - Expert', level: 'B14', minElo: 1600, maxElo: 1699, description: 'Regular 2nd League Starters', leagueEligibility: '2nd League Interclub', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { id: 'tier_b13', order: 8, category: 'B - Expert', level: 'B13', minElo: 1500, maxElo: 1599, description: 'Solid 2nd & 3rd League Contenders', leagueEligibility: '2nd / 3rd League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { id: 'tier_b12', order: 9, category: 'B - Expert', level: 'B12', minElo: 1400, maxElo: 1499, description: 'Established Competitive Club Members', leagueEligibility: '3rd League Interclub', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { id: 'tier_b11', order: 10, category: 'B - Expert', level: 'B11', minElo: 1300, maxElo: 1399, description: 'Developing Competitive League Players', leagueEligibility: '3rd / 4th League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },

    // Category C - Advanced Regional
    { id: 'tier_c10', order: 11, category: 'C - Advanced Regional', level: 'C10', minElo: 1200, maxElo: 1299, description: 'Active Regional Tournament Participants', leagueEligibility: '4th League Interclub', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { id: 'tier_c9', order: 12, category: 'C - Advanced Regional', level: 'C9', minElo: 1100, maxElo: 1199, description: 'Regional Team Players & Club Regulars', leagueEligibility: '4th / 5th League', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { id: 'tier_c8', order: 13, category: 'C - Advanced Regional', level: 'C8', minElo: 1000, maxElo: 1099, description: 'Solid Recreational & Junior Competitors', leagueEligibility: '5th League / Junior A', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { id: 'tier_c7', order: 14, category: 'C - Advanced Regional', level: 'C7', minElo: 900, maxElo: 999, description: 'Club Training & Open Tournament Level', leagueEligibility: '5th League / Junior B', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { id: 'tier_c6', order: 15, category: 'C - Advanced Regional', level: 'C6', minElo: 800, maxElo: 899, description: 'Licensed Players with Basic Match Experience', leagueEligibility: '5th League / Open Cups', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },

    // Category D - Intermediate & Entry
    { id: 'tier_d5', order: 16, category: 'D - Intermediate', level: 'D5', minElo: 700, maxElo: 799, description: 'Entry-Level Licensed Players', leagueEligibility: 'Regional Open Cups', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'tier_d4', order: 17, category: 'D - Intermediate', level: 'D4', minElo: 600, maxElo: 699, description: 'Junior Beginners & Hobby Tournament Level', leagueEligibility: 'Youth Leagues / Hobby', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'tier_d3', order: 18, category: 'D - Intermediate', level: 'D3', minElo: 500, maxElo: 599, description: 'Recreational & Youth Development', leagueEligibility: 'Non-license & Open Days', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'tier_d2', order: 19, category: 'D - Intermediate', level: 'D2', minElo: 400, maxElo: 499, description: 'Recreational & Youth Development', leagueEligibility: 'Non-license & Open Days', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'tier_d1', order: 20, category: 'D - Intermediate', level: 'D1', minElo: 0, maxElo: 399, description: 'Entry Level / Initial Rating', leagueEligibility: 'Non-license & Open Days', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
];

/**
 * Normalizes and sorts tiers in hierarchical rank order (Order 1 = Highest / Elite -> N = Entry Level).
 */
export function sortTiers(tiers: LevelTierDefinition[] = ELO_TIERS_DATA): LevelTierDefinition[] {
    const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : ELO_TIERS_DATA;
    return [...list].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return b.minElo - a.minElo;
    });
}

/**
 * Compares two rank levels.
 * Returns:
 * - Negative if levelA is higher skill than levelB (e.g. A20 vs B12 -> -1)
 * - Positive if levelA is lower skill than levelB (e.g. D5 vs B12 -> +1)
 * - 0 if they are the same level
 */
export function compareLevels(levelA: string, levelB: string, tiers: LevelTierDefinition[] = ELO_TIERS_DATA): number {
    if (levelA === levelB) return 0;
    const sorted = sortTiers(tiers);
    const tierA = sorted.find((t) => t.level.toUpperCase() === levelA.toUpperCase());
    const tierB = sorted.find((t) => t.level.toUpperCase() === levelB.toUpperCase());

    const orderA = tierA ? (tierA.order ?? sorted.indexOf(tierA) + 1) : 999;
    const orderB = tierB ? (tierB.order ?? sorted.indexOf(tierB) + 1) : 999;

    return orderA - orderB;
}

/**
 * Checks if a player's rank level satisfies category minLevel and maxLevel constraints.
 * Tiers are ordered 1 (Highest Elite) -> N (Entry Level).
 * Example: constraints: { maxLevel: 'D5' } -> Player with 'D5', 'D4', 'D1' is eligible; 'C6' is NOT.
 */
export function isLevelEligible(
    playerLevel: string,
    constraints: { minLevel?: string | null; maxLevel?: string | null },
    tiers: LevelTierDefinition[] = ELO_TIERS_DATA,
): boolean {
    if (!playerLevel) return false;
    const sorted = sortTiers(tiers);
    const playerTier = sorted.find((t) => t.level.toUpperCase() === playerLevel.toUpperCase());
    if (!playerTier) return false;

    const playerOrder = playerTier.order ?? sorted.indexOf(playerTier) + 1;

    // maxLevel constraint: Player skill must NOT exceed maxLevel (i.e. playerOrder must be >= maxTier.order)
    if (constraints.maxLevel) {
        const maxTier = sorted.find((t) => t.level.toUpperCase() === constraints.maxLevel?.toUpperCase());
        if (maxTier) {
            const maxOrder = maxTier.order ?? sorted.indexOf(maxTier) + 1;
            if (playerOrder < maxOrder) {
                return false;
            }
        }
    }

    // minLevel constraint: Player skill must be at least minLevel (i.e. playerOrder must be <= minTier.order)
    if (constraints.minLevel) {
        const minTier = sorted.find((t) => t.level.toUpperCase() === constraints.minLevel?.toUpperCase());
        if (minTier) {
            const minOrder = minTier.order ?? sorted.indexOf(minTier) + 1;
            if (playerOrder > minOrder) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Maps any Elo rating point to its official Level string (e.g. 1540 -> "B13", 1000 -> "C8", 350 -> "D1")
 */
export function getLevelFromElo(elo: number, tiers: LevelTierDefinition[] = ELO_TIERS_DATA): string {
    const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : ELO_TIERS_DATA;
    const tier = list.find((t) => elo >= t.minElo && elo <= t.maxElo);
    if (tier) return tier.level;

    const sortedByMax = [...list].sort((a, b) => b.maxElo - a.maxElo);
    if (sortedByMax.length > 0 && elo > sortedByMax[0].maxElo) {
        return sortedByMax[0].level;
    }
    const sortedByMin = [...list].sort((a, b) => a.minElo - b.minElo);
    if (sortedByMin.length > 0 && elo < sortedByMin[0].minElo) {
        return sortedByMin[0].level;
    }

    if (elo > 3000) return 'A20';
    return 'D1';
}

/**
 * Calculates win expectation and rating deltas for two players.
 */
export function calculateEloExchange(
    eloA: number,
    eloB: number,
    winner: 'HOME' | 'AWAY' | 'DRAW',
    kFactor: number = 32,
) {
    const diff = eloB - eloA;
    const expA = 1 / (1 + Math.pow(10, diff / 400));
    const expB = 1 - expA;

    const scoreA = winner === 'HOME' ? 1 : winner === 'AWAY' ? 0 : 0.5;
    const scoreB = 1 - scoreA;

    const deltaA = Math.round(kFactor * (scoreA - expA) * 10) / 10;
    const deltaB = Math.round(kFactor * (scoreB - expB) * 10) / 10;

    return {
        expA,
        expB,
        deltaA,
        deltaB,
        newEloA: Math.max(0, Math.round((eloA + deltaA) * 10) / 10),
        newEloB: Math.max(0, Math.round((eloB + deltaB) * 10) / 10),
    };
}

