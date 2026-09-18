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

export interface DiscountRule {
    name: string;
    amount: number;
    condition?: string;
}

export interface TournamentSettings {
    // 1. General & Multilingual Branding
    nameShort?: string;
    nameDiploma?: string;
    nameI18n?: Record<string, string>;
    tournamentHomeText?: string;
    sport?: string;
    isSimpleMode?: boolean;

    // 2. Schedule, Timings & Deadlines
    plannedStartTime?: string;
    plannedEndTime?: string;
    regStartTime?: string;
    regEndTime?: string;
    deregEndTime?: string;
    deregInfo?: string;
    blockEnrollment?: boolean;
    regPassword?: string;
    noRegPasswordForConfirmation?: boolean;

    // 3. Financials, Fees & Discounts
    currency?: string;
    associationCostSingle?: number;
    associationCostEachDay?: boolean;
    noAssociationCostForUnlicensed?: boolean;
    fineCost?: number;
    manyEnrollmentsDiscount?: number;
    manyEnrollmentsNrCategories?: number;
    manyEnrollmentsDiscountOnlyTotal?: boolean;
    manyEnrollmentsAlsoJuniorCost?: boolean;
    manyEnrollmentsAlsoTeamCost?: boolean;
    moreDiscounts?: DiscountRule[];
    allowOnlinePayment?: boolean;
    forcePaymentDelay?: number;
    enrollmentConfirmationDelay?: number;

    // 4. Eligibility, Restrictions & Limits
    maxNrRegistrationsPerPlayer?: number;
    maxNrRegistrations?: number;
    maxNrPlayers?: number;
    allowOnlyRegions?: string[];
    allowOnlyClubs?: string[];
    playerBlacklist?: string;
    ageCutMonth?: number; // -1: exact date, 0: birth year, 1-12: specific month
    juniorAge?: number;
    categoryConflicts?: Array<[string, string]>;
    forceTelNr?: boolean;
    additionalDataClub?: boolean;
    additionalDataLevel?: boolean;
    additionalDataEmail?: boolean;
    autoEnrollIfOnlyOneCategory?: boolean;

    // 5. Match Logistics, Courts & Match Forms
    chiefReferee?: string;
    allPlayersCanBeReferees?: boolean;
    allowRefOnlyOnCorrectTable?: boolean;
    allowDoubleCourtUsage?: boolean;
    noWhenCourtFreeMessage?: boolean;
    allowMatchesWithoutCourt?: boolean;
    usersCanAddAvailableCourts?: boolean;
    defaultCourtOrder?: string;
    autoSetGamesToCalledOut?: boolean;
    maxNrCallouts?: number;
    automatedCallouts?: boolean;
    usePushNotifications?: boolean;
    skipAwardCeremonies?: boolean;
    useShirtNumbers?: boolean;
    printClubOnMatchform?: boolean;
    printLevelOnMatchform?: boolean;
    printShortTournamentName?: boolean;
    printPlannedStartTime?: boolean;
    printCourtPlaceDetails?: boolean;
    showOnlyPlaceNotCourt?: boolean;
    playersCanPrintMatchForm?: boolean;
    advancedMatchFormTwoRows?: boolean;

    // 6. Draw, Waitlists & Visibility
    allowWaitlist?: boolean;
    hideWaitlistForNonadmins?: boolean;
    autoConfirmTeams?: boolean;
    autoConfirmDoubles?: boolean;
    teamChangeKeepWaitlist?: boolean;
    drawOnlyDisplayPresentTeams?: boolean;
    drawOnlyDisplayPaidTeams?: boolean;
    categoryRankingsShowAllTeams?: boolean;
    categorySortMode?: 'restrictions' | 'date_restrictions' | 'time';
    categorySortModeRestrictions?: 'teamsize' | 'age';

    // 7. Sub-Tournaments
    hasSubTournaments?: boolean;
    subTournamentsName?: Record<string, string> | string;
    subTournamentsNamePlural?: Record<string, string> | string;
    subTournamentPassword?: string;
    allowSamePlayerInMultipleSubTournaments?: boolean;
    newSubTournamentInfotext?: string;

    // 8. Communications & Emails
    registrationMailText?: string;
    registrationMailHideCost?: boolean;

    // 9. Organizer Invoicing & Banking Details
    organizerName?: string;
    organizerIban?: string;
    organizerCountry?: string;
    organizerZip?: string;
    organizerCity?: string;
    organizerStreet?: string;
    organizerStreetNumber?: string;

    // 10. Operations & Backups
    autoBackup?: number;
    keepNrBackups?: number;
    backupWithChangeData?: boolean;
    showInArchive?: boolean;
    hideInGlobalArchive?: boolean;
}

