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

export enum AuditCategory {
    AUTH = 'AUTH',
    GOVERNANCE = 'GOVERNANCE',
    FINANCE = 'FINANCE',
    COMMUNICATION = 'COMMUNICATION',
    LICENSING = 'LICENSING',
    TOURNAMENT = 'TOURNAMENT',
    CLUB = 'CLUB',
    DEVELOPER = 'DEVELOPER',
    SECURITY = 'SECURITY',
}

export interface AuditLogDto {
    id: string;
    userId?: string | null;
    userEmail: string;
    userName?: string | null;
    action: string;
    category: AuditCategory;
    entityType?: string | null;
    entityId?: string | null;
    associationId?: string | null;
    clubId?: string | null;
    tournamentId?: string | null;
    description: string;
    status: 'SUCCESS' | 'FAILURE' | 'WARNING';
    ipAddress: string;
    userAgent: string;
    metadata: Record<string, any>;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
    } | null;
    association?: {
        id: string;
        name: string;
        shortName?: string;
    } | null;
    club?: {
        id: string;
        name: string;
    } | null;
}

export interface AuditLogFilterDto {
    associationId?: string;
    clubId?: string;
    tournamentId?: string;
    userId?: string;
    category?: string;
    action?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface AuditStatsDto {
    totalLogs: number;
    todayLogs: number;
    categoryBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    topActors: Array<{
        userEmail: string;
        userName: string;
        count: number;
    }>;
    recentTimeline: Array<{
        date: string;
        count: number;
    }>;
}

export enum NoticeType {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
    SUCCESS = 'SUCCESS',
}

export enum NoticeDisplayMode {
    BANNER = 'BANNER',
    MODAL = 'MODAL',
}

export enum NoticeTargetGroup {
    ALL = 'ALL',
    SUPER_ADMINS = 'SUPER_ADMINS',
    ASSOCIATION_ADMINS = 'ASSOCIATION_ADMINS',
    CLUB_ADMINS = 'CLUB_ADMINS',
    PLAYERS = 'PLAYERS',
    COACHES = 'COACHES',
    REFEREES = 'REFEREES',
}

export interface AdminNoticeDto {
    id: string;
    title: string;
    content: string;
    type: NoticeType;
    displayMode: NoticeDisplayMode;
    targetGroup: NoticeTargetGroup;
    associationId?: string | null;
    clubId?: string | null;
    isDismissible: boolean;
    isActive: boolean;
    priority: number;
    startsAt: string;
    expiresAt?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
    association?: {
        id: string;
        name: string;
        shortName?: string;
    } | null;
    club?: {
        id: string;
        name: string;
    } | null;
    _count?: {
        dismissals: number;
    };
}

export interface CreateNoticeDto {
    title: string;
    content: string;
    type?: NoticeType;
    displayMode?: NoticeDisplayMode;
    targetGroup?: NoticeTargetGroup;
    associationId?: string | null;
    clubId?: string | null;
    isDismissible?: boolean;
    isActive?: boolean;
    priority?: number;
    startsAt?: string;
    expiresAt?: string | null;
}

export interface UpdateNoticeDto {
    title?: string;
    content?: string;
    type?: NoticeType;
    displayMode?: NoticeDisplayMode;
    targetGroup?: NoticeTargetGroup;
    associationId?: string | null;
    clubId?: string | null;
    isDismissible?: boolean;
    isActive?: boolean;
    priority?: number;
    startsAt?: string;
    expiresAt?: string | null;
}



