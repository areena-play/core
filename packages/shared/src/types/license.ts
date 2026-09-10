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

export enum LicenseScope {
    ALL = 'ALL',
    LEAGUE_ONLY = 'LEAGUE_ONLY',
}

export enum CourseType {
    COACH_REFRESHER = 'COACH_REFRESHER',
    REFEREE_REFRESHER = 'REFEREE_REFRESHER',
}

export interface LicenseDto {
    id: string;
    userId: string;
    type: LicenseType;
    status: LicenseStatus;
    clubId?: string | null;
    associationId: string;
    seasonId?: string | null;
    tournamentId?: string | null;
    isSecondaryClubLicense?: boolean;
    scope?: LicenseScope | string;
    validFrom: string;
    validUntil: string;
    autoApproved: boolean;
    appliedByUserId: string;
    approvedByUserId?: string | null;
    rejectionReason?: string | null;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    user?: any;
    club?: any;
    association?: any;
    tournament?: any;
}
