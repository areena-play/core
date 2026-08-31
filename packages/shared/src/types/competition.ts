export enum CompetitionType {
    LEAGUE = 'LEAGUE',
    TOURNAMENT = 'TOURNAMENT',
    SEASON_TOURNAMENT = 'SEASON_TOURNAMENT',
    CUP = 'CUP',
    INOFFICIAL = 'INOFFICIAL',
    FRIENDLY = 'FRIENDLY',
    RANKING_TOURNAMENT = 'RANKING_TOURNAMENT',
}

export enum CompetitionStatus {
    DRAFT = 'DRAFT',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REGISTRATION_OPEN = 'REGISTRATION_OPEN',
    REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REJECTED = 'REJECTED',
}

export enum CompetitionRole {
    ADMIN = 'ADMIN',
    ENTER_RESULTS = 'ENTER_RESULTS',
    ASSIGN_COURTS = 'ASSIGN_COURTS',
    SPEAKER = 'SPEAKER',
    HEAD_REFEREE = 'HEAD_REFEREE',
    REFEREE = 'REFEREE',
    CASHIER = 'CASHIER',
    CREATE_BACKUPS = 'CREATE_BACKUPS',
    EDIT_REGISTRATIONS = 'EDIT_REGISTRATIONS',
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
}
