export enum CompetitionType {
    LEAGUE = 'LEAGUE',
    TOURNAMENT = 'TOURNAMENT',
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

