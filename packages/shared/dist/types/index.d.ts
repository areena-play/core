export * from './i18n';
export declare enum AssociationLevel {
    NATIONAL = "NATIONAL",
    REGIONAL = "REGIONAL",
    LOCAL = "LOCAL"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare enum LicenseType {
    PLAYER_REGULAR = "PLAYER_REGULAR",
    PLAYER_TCARD = "PLAYER_TCARD",
    PLAYER_WOMEN = "PLAYER_WOMEN",
    PLAYER_JUNIOR = "PLAYER_JUNIOR",
    PLAYER_SENIOR = "PLAYER_SENIOR",
    COACH = "COACH",
    REFEREE = "REFEREE"
}
export declare enum LicenseStatus {
    PENDING_CLUB = "PENDING_CLUB",
    PENDING_ASSOCIATION = "PENDING_ASSOCIATION",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
    SUSPENDED = "SUSPENDED"
}
export declare enum CourseType {
    COACH_REFRESHER = "COACH_REFRESHER",
    REFEREE_REFRESHER = "REFEREE_REFRESHER"
}
export declare enum CompetitionType {
    LEAGUE = "LEAGUE",
    TOURNAMENT = "TOURNAMENT"
}
export declare enum CompetitionStatus {
    DRAFT = "DRAFT",
    REGISTRATION_OPEN = "REGISTRATION_OPEN",
    REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum GenderRestriction {
    ANY = "ANY",
    MALE_ONLY = "MALE_ONLY",
    FEMALE_ONLY = "FEMALE_ONLY",
    MIXED = "MIXED"
}
export declare enum EncounterStatus {
    SCHEDULED = "SCHEDULED",
    LIVE = "LIVE",
    FINISHED = "FINISHED",
    POSTPONED = "POSTPONED",
    CANCELLED = "CANCELLED"
}
export declare enum MatchType {
    SINGLE = "SINGLE",
    DOUBLE = "DOUBLE"
}
export declare enum MatchWinner {
    HOME = "HOME",
    AWAY = "AWAY",
    DRAW = "DRAW",
    PENDING = "PENDING"
}
export declare enum EventType {
    TOURNAMENT = "TOURNAMENT",
    LEAGUE_MATCH = "LEAGUE_MATCH",
    REFRESHER_COURSE = "REFRESHER_COURSE",
    ASSOCIATION_MEETING = "ASSOCIATION_MEETING",
    CLUB_EVENT = "CLUB_EVENT",
    TRAINING = "TRAINING"
}
export declare enum MessageChannel {
    EMAIL = "EMAIL",
    SMS = "SMS"
}
export declare enum OAuthClientStatus {
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REVOKED = "REVOKED"
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
export declare enum InvoiceStatus {
    DRAFT = "DRAFT",
    SENT = "SENT",
    PAID = "PAID",
    OVERDUE = "OVERDUE",
    CANCELLED = "CANCELLED"
}
export declare enum InvoiceCategory {
    MEMBERSHIP_FEE = "MEMBERSHIP_FEE",
    LICENSE_FEE = "LICENSE_FEE",
    COMPETITION_ENTRY = "COMPETITION_ENTRY",
    COURSE_FEE = "COURSE_FEE",
    EQUIPMENT = "EQUIPMENT",
    PENALTY = "PENALTY",
    OTHER = "OTHER"
}
export declare enum InvoiceTargetType {
    MEMBER_CLUB = "MEMBER_CLUB",
    CLUB_MEMBER = "CLUB_MEMBER",
    INDIVIDUAL_PLAYER = "INDIVIDUAL_PLAYER",
    SUB_ASSOCIATION = "SUB_ASSOCIATION",
    OTHER = "OTHER"
}
export interface InvoiceLineItemDto {
    id?: string;
    position?: number;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice?: number;
    taxRate?: number;
    bexioArticleId?: number | null;
}
export interface InvoiceDto {
    id: string;
    invoiceNumber: string;
    associationId?: string | null;
    clubId?: string | null;
    targetType: InvoiceTargetType;
    recipientClubId?: string | null;
    recipientUserId?: string | null;
    recipientName: string;
    recipientEmail?: string | null;
    recipientAddress?: string | null;
    status: InvoiceStatus;
    category: InvoiceCategory;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    issueDate: string;
    dueDate: string;
    paidAt?: string | null;
    notes?: string | null;
    terms?: string | null;
    bexioId?: number | null;
    bexioSyncedAt?: string | null;
    bexioSyncStatus?: string | null;
    bexioQrPdfUrl?: string | null;
    createdAt: string;
    updatedAt: string;
    lineItems?: InvoiceLineItemDto[];
    association?: any;
    club?: any;
    recipientClub?: any;
    recipientUser?: any;
}
export interface BexioConfigDto {
    id?: string;
    associationId?: string | null;
    clubId?: string | null;
    apiToken?: string | null;
    userId?: number | null;
    bankAccountId?: number | null;
    taxId?: number | null;
    paymentTypeId?: number | null;
    iban?: string | null;
    qrIban?: string | null;
    companyName?: string | null;
    companyAddress?: string | null;
    autoSync: boolean;
    isConnected: boolean;
    lastSyncAt?: string | null;
}
export declare enum AuditCategory {
    AUTH = "AUTH",
    GOVERNANCE = "GOVERNANCE",
    FINANCE = "FINANCE",
    COMMUNICATION = "COMMUNICATION",
    LICENSING = "LICENSING",
    TOURNAMENT = "TOURNAMENT",
    CLUB = "CLUB",
    DEVELOPER = "DEVELOPER",
    SECURITY = "SECURITY"
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
//# sourceMappingURL=index.d.ts.map