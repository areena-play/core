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
    side: 'HOME_1' | 'HOME_2' | 'AWAY_1' | 'AWAY_2';
    user?: any;
}

export interface PlayerEligibilityResult {
    eligible: boolean;
    reason?: string;
    licenseUsed?: any;
}

export interface LevelTierDefinition {
    category: string;
    level: string;
    minElo: number;
    maxElo: number;
    description: string;
    leagueEligibility: string;
}

export const ELO_TIERS_DATA: LevelTierDefinition[] = [
    // Category A - National Elite
    { category: 'A - National Elite', level: 'A20', minElo: 2200, maxElo: 3000, description: 'National Champions, Olympic & World Tour Players', leagueEligibility: 'National League A (NLA)' },
    { category: 'A - National Elite', level: 'A19', minElo: 2100, maxElo: 2199, description: 'Top National League Competitors', leagueEligibility: 'National League A (NLA)' },
    { category: 'A - National Elite', level: 'A18', minElo: 2000, maxElo: 2099, description: 'National League & Top Regional Players', leagueEligibility: 'National League B (NLB)' },
    { category: 'A - National Elite', level: 'A17', minElo: 1900, maxElo: 1999, description: 'Semi-Professional & Elite Regional Competitors', leagueEligibility: 'National League B (NLB)' },
    { category: 'A - National Elite', level: 'A16', minElo: 1800, maxElo: 1899, description: 'High-Level 1st League Players', leagueEligibility: '1st League Interclub' },

    // Category B - Expert
    { category: 'B - Expert', level: 'B15', minElo: 1700, maxElo: 1799, description: 'Experienced 1st League Club Representatives', leagueEligibility: '1st / 2nd League' },
    { category: 'B - Expert', level: 'B14', minElo: 1600, maxElo: 1699, description: 'Regular 2nd League Starters', leagueEligibility: '2nd League Interclub' },
    { category: 'B - Expert', level: 'B13', minElo: 1500, maxElo: 1599, description: 'Solid 2nd & 3rd League Contenders', leagueEligibility: '2nd / 3rd League' },
    { category: 'B - Expert', level: 'B12', minElo: 1400, maxElo: 1499, description: 'Established Competitive Club Members', leagueEligibility: '3rd League Interclub' },
    { category: 'B - Expert', level: 'B11', minElo: 1300, maxElo: 1399, description: 'Developing Competitive League Players', leagueEligibility: '3rd / 4th League' },

    // Category C - Advanced Regional
    { category: 'C - Advanced Regional', level: 'C10', minElo: 1200, maxElo: 1299, description: 'Active Regional Tournament Participants', leagueEligibility: '4th League Interclub' },
    { category: 'C - Advanced Regional', level: 'C9', minElo: 1100, maxElo: 1199, description: 'Regional Team Players & Club Regulars', leagueEligibility: '4th / 5th League' },
    { category: 'C - Advanced Regional', level: 'C8', minElo: 1000, maxElo: 1099, description: 'Solid Recreational & Junior Competitors', leagueEligibility: '5th League / Junior A' },
    { category: 'C - Advanced Regional', level: 'C7', minElo: 900, maxElo: 999, description: 'Club Training & Open Tournament Level', leagueEligibility: '5th League / Junior B' },
    { category: 'C - Advanced Regional', level: 'C6', minElo: 800, maxElo: 899, description: 'Licensed Players with Basic Match Experience', leagueEligibility: '5th League / Open Cups' },

    // Category D - Intermediate & Entry
    { category: 'D - Intermediate', level: 'D5', minElo: 700, maxElo: 799, description: 'Entry-Level Licensed Players', leagueEligibility: 'Regional Open Cups' },
    { category: 'D - Intermediate', level: 'D4', minElo: 600, maxElo: 699, description: 'Junior Beginners & Hobby Tournament Level', leagueEligibility: 'Youth Leagues / Hobby' },
    { category: 'D - Intermediate', level: 'D3', minElo: 500, maxElo: 599, description: 'Recreational & Youth Development', leagueEligibility: 'Non-license & Open Days' },
    { category: 'D - Intermediate', level: 'D2', minElo: 400, maxElo: 499, description: 'Recreational & Youth Development', leagueEligibility: 'Non-license & Open Days' },
    { category: 'D - Intermediate', level: 'D1', minElo: 0, maxElo: 399, description: 'Entry Level / Initial Rating', leagueEligibility: 'Non-license & Open Days' },
];

/**
 * Maps any Elo rating point to its official Level string (e.g. 1540 -> "B13", 1000 -> "C8", 350 -> "D1")
 */
export function getLevelFromElo(elo: number): string {
    const tier = ELO_TIERS_DATA.find((t) => elo >= t.minElo && elo <= t.maxElo);
    if (tier) return tier.level;
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

