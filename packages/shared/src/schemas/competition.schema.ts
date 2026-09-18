import { z } from 'zod';
import { CompetitionType, CompetitionRole, GenderRestriction, LicenseType, MatchWinner } from '../types';

export const discountRuleSchema = z.object({
    name: z.string(),
    amount: z.number(),
    condition: z.string().optional(),
});

export const tournamentSettingsSchema = z.object({
    // 1. General & Multilingual Branding
    nameShort: z.string().optional().nullable(),
    nameDiploma: z.string().optional().nullable(),
    nameI18n: z.record(z.string()).optional().nullable(),
    tournamentHomeText: z.string().optional().nullable(),
    sportId: z.string().uuid().optional().nullable(),
    sport: z.string().optional().nullable(),
    isSimpleMode: z.boolean().optional(),

    // 2. Schedule, Timings & Deadlines
    plannedStartTime: z.string().optional().nullable(),
    plannedEndTime: z.string().optional().nullable(),
    regStartTime: z.string().optional().nullable(),
    regEndTime: z.string().optional().nullable(),
    deregEndTime: z.string().optional().nullable(),
    deregInfo: z.string().optional().nullable(),
    blockEnrollment: z.boolean().optional(),
    regPassword: z.string().optional().nullable(),
    noRegPasswordForConfirmation: z.boolean().optional(),

    // 3. Financials, Fees & Discounts
    currency: z.string().optional().nullable(),
    associationCostSingle: z.number().optional().nullable(),
    associationCostEachDay: z.boolean().optional(),
    noAssociationCostForUnlicensed: z.boolean().optional(),
    fineCost: z.number().optional().nullable(),
    manyEnrollmentsDiscount: z.number().optional().nullable(),
    manyEnrollmentsNrCategories: z.number().optional().nullable(),
    manyEnrollmentsDiscountOnlyTotal: z.boolean().optional(),
    manyEnrollmentsAlsoJuniorCost: z.boolean().optional(),
    manyEnrollmentsAlsoTeamCost: z.boolean().optional(),
    moreDiscounts: z.array(discountRuleSchema).optional().nullable(),
    allowOnlinePayment: z.boolean().optional(),
    forcePaymentDelay: z.number().optional().nullable(),
    enrollmentConfirmationDelay: z.number().optional().nullable(),

    // 4. Eligibility, Restrictions & Limits
    maxNrRegistrationsPerPlayer: z.number().optional().nullable(),
    maxNrRegistrations: z.number().optional().nullable(),
    maxNrPlayers: z.number().optional().nullable(),
    allowOnlyRegions: z.array(z.string()).optional().nullable(),
    allowOnlyClubs: z.array(z.string()).optional().nullable(),
    playerBlacklist: z.string().optional().nullable(),
    ageCutMonth: z.number().optional().nullable(),
    juniorAge: z.number().optional().nullable(),
    categoryConflicts: z.array(z.tuple([z.string(), z.string()])).optional().nullable(),
    forceTelNr: z.boolean().optional(),
    additionalDataClub: z.boolean().optional(),
    additionalDataLevel: z.boolean().optional(),
    additionalDataEmail: z.boolean().optional(),
    autoEnrollIfOnlyOneCategory: z.boolean().optional(),

    // 5. Match Logistics, Courts & Match Forms
    chiefReferee: z.string().optional().nullable(),
    allPlayersCanBeReferees: z.boolean().optional(),
    allowRefOnlyOnCorrectTable: z.boolean().optional(),
    allowDoubleCourtUsage: z.boolean().optional(),
    noWhenCourtFreeMessage: z.boolean().optional(),
    allowMatchesWithoutCourt: z.boolean().optional(),
    usersCanAddAvailableCourts: z.boolean().optional(),
    defaultCourtOrder: z.string().optional().nullable(),
    autoSetGamesToCalledOut: z.boolean().optional(),
    maxNrCallouts: z.number().optional().nullable(),
    automatedCallouts: z.boolean().optional(),
    usePushNotifications: z.boolean().optional(),
    skipAwardCeremonies: z.boolean().optional(),
    useShirtNumbers: z.boolean().optional(),
    printClubOnMatchform: z.boolean().optional(),
    printLevelOnMatchform: z.boolean().optional(),
    printShortTournamentName: z.boolean().optional(),
    printPlannedStartTime: z.boolean().optional(),
    printCourtPlaceDetails: z.boolean().optional(),
    showOnlyPlaceNotCourt: z.boolean().optional(),
    playersCanPrintMatchForm: z.boolean().optional(),
    advancedMatchFormTwoRows: z.boolean().optional(),

    // 6. Draw, Waitlists & Visibility
    allowWaitlist: z.boolean().optional(),
    hideWaitlistForNonadmins: z.boolean().optional(),
    autoConfirmTeams: z.boolean().optional(),
    autoConfirmDoubles: z.boolean().optional(),
    teamChangeKeepWaitlist: z.boolean().optional(),
    drawOnlyDisplayPresentTeams: z.boolean().optional(),
    drawOnlyDisplayPaidTeams: z.boolean().optional(),
    categoryRankingsShowAllTeams: z.boolean().optional(),
    categorySortMode: z.enum(['restrictions', 'date_restrictions', 'time']).optional().nullable(),
    categorySortModeRestrictions: z.enum(['teamsize', 'age']).optional().nullable(),

    // 7. Sub-Tournaments
    hasSubTournaments: z.boolean().optional(),
    subTournamentsName: z.union([z.record(z.string()), z.string()]).optional().nullable(),
    subTournamentsNamePlural: z.union([z.record(z.string()), z.string()]).optional().nullable(),
    subTournamentPassword: z.string().optional().nullable(),
    allowSamePlayerInMultipleSubTournaments: z.boolean().optional(),
    newSubTournamentInfotext: z.string().optional().nullable(),

    // 8. Communications & Emails
    registrationMailText: z.string().optional().nullable(),
    registrationMailHideCost: z.boolean().optional(),

    // 9. Organizer Invoicing & Banking Details
    organizerName: z.string().optional().nullable(),
    organizerIban: z.string().optional().nullable(),
    organizerCountry: z.string().optional().nullable(),
    organizerZip: z.string().optional().nullable(),
    organizerCity: z.string().optional().nullable(),
    organizerStreet: z.string().optional().nullable(),
    organizerStreetNumber: z.string().optional().nullable(),

    // 10. Operations & Backups
    autoBackup: z.number().optional().nullable(),
    keepNrBackups: z.number().optional().nullable(),
    backupWithChangeData: z.boolean().optional(),
    showInArchive: z.boolean().optional(),
    hideInGlobalArchive: z.boolean().optional(),
}).partial();

export const baseCompetitionSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase alphanumeric characters and hyphens').optional(),
    seriesSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Series slug must contain only lowercase alphanumeric characters and hyphens').optional().nullable(),
    description: z.string().optional().nullable(),
    type: z.nativeEnum(CompetitionType),
    associationId: z.string().uuid(),
    seasonId: z.string().uuid().optional().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string().optional().nullable(),
    isOfficial: z.boolean().optional().default(true),
    countsForElo: z.boolean().optional().default(true),
    requiresApproval: z.boolean().optional().default(false),
    entryFee: z.number().nonnegative().optional().default(0),
    status: z.string().optional(),
}).merge(tournamentSettingsSchema);

export const createCompetitionSchema = baseCompetitionSchema;

export const updateCompetitionSchema = baseCompetitionSchema.partial();

export const assignCompetitionRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.nativeEnum(CompetitionRole),
});

export const speakerCalloutSchema = z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.string().optional().default('MATCH_CALL'),
    unitName: z.string().optional().nullable(),
});

export const updateRegistrationPaymentSchema = z.object({
    paymentStatus: z.enum(['UNPAID', 'PAID', 'EXEMPT', 'REFUNDED']),
    paidAmount: z.number().nonnegative().optional(),
    paymentMethod: z.string().optional().nullable(),
    isCheckedIn: z.boolean().optional(),
});

export const createCategorySchema = z.object({
    competitionId: z.string().uuid().optional(),
    name: z.string().min(2),
    nameI18n: z.record(z.string()).optional().nullable(),
    teamSize: z.number().int().positive().default(1),
    minElo: z.number().int().optional().nullable(),
    maxElo: z.number().int().optional().nullable(),
    minAge: z.number().int().optional().nullable(),
    maxAge: z.number().int().optional().nullable(),
    genderRestriction: z.nativeEnum(GenderRestriction).default(GenderRestriction.ANY),
    requiredLicenseType: z.nativeEnum(LicenseType).optional().nullable(),
    encounterFormat: z.array(z.any()).optional(),
    roundsPerGroup: z.number().int().positive().default(1),
});

export const updateMatchScoreSchema = z.object({
    result: z.string().optional().nullable(),
    homeScore: z.number().int().nonnegative().optional(),
    awayScore: z.number().int().nonnegative().optional(),
    winner: z.nativeEnum(MatchWinner).optional(),
    isFinished: z.boolean().default(false),
    sets: z.array(
        z.object({
            home: z.number().int().nonnegative(),
            away: z.number().int().nonnegative(),
        }),
    ).optional(),
});
