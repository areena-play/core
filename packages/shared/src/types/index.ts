export * from './i18n';

export enum AssociationLevel {
    NATIONAL = 'NATIONAL',
    REGIONAL = 'REGIONAL',
    LOCAL = 'LOCAL',
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
}

export enum LicenseType {
    PLAYER_REGULAR = 'PLAYER_REGULAR',
    PLAYER_TCARD = 'PLAYER_TCARD',
    PLAYER_WOMEN = 'PLAYER_WOMEN',
    PLAYER_JUNIOR = 'PLAYER_JUNIOR',
    PLAYER_SENIOR = 'PLAYER_SENIOR',
    COACH = 'COACH',
    REFEREE = 'REFEREE',
}

export enum LicenseStatus {
    PENDING_CLUB = 'PENDING_CLUB',
    PENDING_ASSOCIATION = 'PENDING_ASSOCIATION',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    SUSPENDED = 'SUSPENDED',
}

export enum CourseType {
    COACH_REFRESHER = 'COACH_REFRESHER',
    REFEREE_REFRESHER = 'REFEREE_REFRESHER',
}

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

export enum GenderRestriction {
    ANY = 'ANY',
    MALE_ONLY = 'MALE_ONLY',
    FEMALE_ONLY = 'FEMALE_ONLY',
    MIXED = 'MIXED',
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

export enum EventType {
    TOURNAMENT = 'TOURNAMENT',
    LEAGUE_MATCH = 'LEAGUE_MATCH',
    REFRESHER_COURSE = 'REFRESHER_COURSE',
    ASSOCIATION_MEETING = 'ASSOCIATION_MEETING',
    CLUB_EVENT = 'CLUB_EVENT',
    TRAINING = 'TRAINING',
}

export enum MessageChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
}

export enum OAuthClientStatus {
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REVOKED = 'REVOKED',
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    birthDate?: string | null;
    gender?: Gender | null;
    licenseId?: string | null;
    eloPoints: number;
    rank?: number | null;
    avatarUrl?: string | null;
    isSuperAdmin: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AssociationRuleConfig {
    rankingSystem?: string;
    matchRules?: Record<string, any>;
    autoApproveDomesticTCards?: boolean;
    refresherValidityMonths?: number;
    licenseIdTemplate?: string;
    customRules?: Record<string, any>;
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
