export enum CompetitionType {
    LEAGUE = 'LEAGUE',
    TOURNAMENT = 'TOURNAMENT',
    SEASON_TOURNAMENT = 'SEASON_TOURNAMENT',
}

export enum CompetitionStatus {
    DRAFT = 'DRAFT',
    REGISTRATION_OPEN = 'REGISTRATION_OPEN',
    REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum EncounterStatus {
    SCHEDULED = 'SCHEDULED',
    LIVE = 'LIVE',
    FINISHED = 'FINISHED',
    POSTPONED = 'POSTPONED',
    CANCELLED = 'CANCELLED',
}

export enum MatchType {
    SINGLE = 'SINGLE',
    DOUBLE = 'DOUBLE',
}

export enum MatchWinner {
    HOME = 'HOME',
    AWAY = 'AWAY',
    DRAW = 'DRAW',
    PENDING = 'PENDING',
}

export interface EncounterFormatItem {
    type: MatchType;
    orderIndex: number;
    homePlayerSlot: number;
    awayPlayerSlot: number;
    homePlayer2Slot?: number;
    awayPlayer2Slot?: number;
    label?: string;
}

export interface MatchSetScore {
    home: number;
    away: number;
}

export interface TournamentCategoryDto {
    id: string;
    competitionId: string;
    name: string;
    nameI18n?: Record<string, string> | null;
    teamSize: number;
    minElo?: number | null;
    maxElo?: number | null;
    minAge?: number | null;
    maxAge?: number | null;
    genderRestriction?: string;
    requiredLicenseType?: string | null;
    encounterFormat?: any;
    roundsPerGroup?: number;
    createdAt?: string;
    updatedAt?: string;
}

