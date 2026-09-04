import { HttpClient, subscribeApiLoading, API_VERSION, API_BASE } from './client';
import { SystemApi } from './modules/system.api';
import { AuthApi } from './modules/auth.api';
import { UsersApi } from './modules/users.api';
import { AssociationsApi } from './modules/associations.api';
import { ClubsApi } from './modules/clubs.api';
import { LicensesApi } from './modules/licenses.api';
import { LocationsApi } from './modules/locations.api';
import { CompetitionsApi } from './modules/competitions.api';
import { CalendarApi } from './modules/calendar.api';
import { MessagesApi } from './modules/messages.api';
import { OAuthApi } from './modules/oauth.api';
import { InvoicesApi } from './modules/invoices.api';
import { AuditApi } from './modules/audit.api';
import { NoticesApi } from './modules/notices.api';
import { SupportApi } from './modules/support.api';
import { AdminApi } from './modules/admin.api';

export * from './client';
export * from './modules/system.api';
export * from './modules/auth.api';
export * from './modules/users.api';
export * from './modules/associations.api';
export * from './modules/clubs.api';
export * from './modules/licenses.api';
export * from './modules/locations.api';
export * from './modules/competitions.api';
export * from './modules/calendar.api';
export * from './modules/messages.api';
export * from './modules/oauth.api';
export * from './modules/invoices.api';
export * from './modules/audit.api';
export * from './modules/notices.api';
export * from './modules/support.api';
export * from './modules/admin.api';

export class ApiClient extends HttpClient {
    public readonly system: SystemApi;
    public readonly auth: AuthApi;
    public readonly users: UsersApi;
    public readonly associations: AssociationsApi;
    public readonly clubs: ClubsApi;
    public readonly licenses: LicensesApi;
    public readonly locations: LocationsApi;
    public readonly competitions: CompetitionsApi;
    public readonly calendar: CalendarApi;
    public readonly messages: MessagesApi;
    public readonly oauth: OAuthApi;
    public readonly invoices: InvoicesApi;
    public readonly audit: AuditApi;
    public readonly notices: NoticesApi;
    public readonly support: SupportApi;
    public readonly admin: AdminApi;

    constructor() {
        super();
        this.system = new SystemApi(this);
        this.auth = new AuthApi(this);
        this.users = new UsersApi(this);
        this.associations = new AssociationsApi(this);
        this.clubs = new ClubsApi(this);
        this.licenses = new LicensesApi(this);
        this.locations = new LocationsApi(this);
        this.competitions = new CompetitionsApi(this);
        this.calendar = new CalendarApi(this);
        this.messages = new MessagesApi(this);
        this.oauth = new OAuthApi(this);
        this.invoices = new InvoicesApi(this);
        this.audit = new AuditApi(this);
        this.notices = new NoticesApi(this);
        this.support = new SupportApi(this);
        this.admin = new AdminApi(this);
    }

    // Direct proxy convenience methods for unified access & 100% backward compatibility
    getPublicConfig = () => this.system.getPublicConfig();
    getSetupStatus = () => this.system.getSetupStatus();
    initializeSetup = (body: any) => this.system.initializeSetup(body);

    login = (body: any) => this.auth.login(body);
    register = (body: any) => this.auth.register(body);
    verifyEmail = (token: string) => this.auth.verifyEmail(token);
    resendVerification = (email: string) => this.auth.resendVerification(email);
    getMe = () => this.auth.getMe();
    getProfileOverview = () => this.auth.getProfileOverview();
    updateProfile = (body: any) => this.auth.updateProfile(body);
    requestEmailChange = (newEmail: string) => this.auth.requestEmailChange(newEmail);
    confirmEmailChange = (token: string) => this.auth.confirmEmailChange(token);
    forgotPassword = (email: string) => this.auth.forgotPassword(email);
    resetPassword = (body: { token: string; password: string }) => this.auth.resetPassword(body);
    changePassword = (body: { currentPassword: string; newPassword: string }) => this.auth.changePassword(body);
    getUsers = (params?: string | { q?: string; associationId?: string; role?: string; page?: number; limit?: number }) => this.auth.getUsers(params);
    getPerson = (identifier: string) => this.auth.getPerson(identifier);
    globalSearch = (query: string) => this.auth.globalSearch(query);

    getAdminUsers = (params?: Record<string, any>) => this.users.getAdminUsers(params);
    getAdminUser = (id: string) => this.users.getAdminUser(id);
    updateAdminUser = (id: string, body: any) => this.users.updateAdminUser(id, body);
    adminResetPassword = (id: string, body?: { newPassword?: string; autoGenerate?: boolean }) => this.users.adminResetPassword(id, body);
    adminToggleSuperAdmin = (id: string) => this.users.adminToggleSuperAdmin(id);
    adminSendVerification = (id: string) => this.users.adminSendVerification(id);
    adminDeleteUser = (id: string) => this.users.adminDeleteUser(id);

    getTopAssociation = () => this.associations.getTopAssociation();
    getAssociations = () => this.associations.getAssociations();
    getAssociation = (id: string) => this.associations.getAssociation(id);
    getAssociationRules = (id: string) => this.associations.getAssociationRules(id);
    createAssociation = (body: any) => this.associations.createAssociation(body);
    updateAssociationSettings = (associationId: string, body: any) => this.associations.updateAssociationSettings(associationId, body);
    uploadAssociationLogo = (associationId: string, file: File) => this.associations.uploadAssociationLogo(associationId, file);
    deleteAssociationLogo = (associationId: string) => this.associations.deleteAssociationLogo(associationId);
    updateLicenseIdTemplate = (associationId: string, body: any) => this.associations.updateLicenseIdTemplate(associationId, body);
    createSeason = (associationId: string, body: any) => this.associations.createSeason(associationId, body);
    getSeasons = (associationId: string) => this.associations.getSeasons(associationId);
    updateSeason = (associationId: string, seasonId: string, body: any) => this.associations.updateSeason(associationId, seasonId, body);
    setCurrentSeason = (associationId: string, seasonId: string) => this.associations.setCurrentSeason(associationId, seasonId);
    deleteSeason = (associationId: string, seasonId: string) => this.associations.deleteSeason(associationId, seasonId);

    getClubs = () => this.clubs.getClubs();
    getClub = (id: string) => this.clubs.getClub(id);
    createClub = (body: any) => this.clubs.createClub(body);

    getLicenses = (params?: Record<string, string>) => this.licenses.getLicenses(params);
    applyLicense = (body: any) => this.licenses.applyLicense(body);
    approveLicense = (licenseId: string, body: any) => this.licenses.approveLicense(licenseId, body);
    updateUserLicenseId = (userId: string, licenseId: string) => this.licenses.updateUserLicenseId(userId, licenseId);
    getRefresherCourses = () => this.licenses.getRefresherCourses();
    createRefresherCourse = (body: any) => this.licenses.createRefresherCourse(body);
    attestCourseAttendance = (courseId: string, body: any) => this.licenses.attestCourseAttendance(courseId, body);

    getLocations = (params?: Record<string, string>) => this.locations.getLocations(params);
    getLocation = (idOrSlug: string) => this.locations.getLocation(idOrSlug);
    createLocation = (body: any) => this.locations.createLocation(body);
    updateLocation = (id: string, body: any) => this.locations.updateLocation(id, body);
    deleteLocation = (id: string) => this.locations.deleteLocation(id);
    createLocationUnit = (locationId: string, body: any) => this.locations.createLocationUnit(locationId, body);
    updateLocationUnit = (locationId: string, unitId: string, body: any) => this.locations.updateLocationUnit(locationId, unitId, body);
    deleteLocationUnit = (locationId: string, unitId: string) => this.locations.deleteLocationUnit(locationId, unitId);
    getLocationReservations = (locationId: string, params?: Record<string, string>) => this.locations.getLocationReservations(locationId, params);
    createLocationReservation = (locationId: string, body: any) => this.locations.createLocationReservation(locationId, body);
    deleteLocationReservation = (locationId: string, resId: string) => this.locations.deleteLocationReservation(locationId, resId);

    getCompetitions = (params?: Record<string, string>) => this.competitions.getCompetitions(params);
    getCompetition = (id: string) => this.competitions.getCompetition(id);
    getLiveEncounters = () => this.competitions.getLiveEncounters();
    createCompetition = (body: any) => this.competitions.createCompetition(body);
    createCompetitionCategory = (competitionId: string, body: any) => this.competitions.createCompetitionCategory(competitionId, body);
    createCategoryTeam = (categoryId: string, body: any) => this.competitions.createCategoryTeam(categoryId, body);
    generateCategoryGroups = (categoryId: string, body: any) => this.competitions.generateCategoryGroups(categoryId, body);
    createCategory = (competitionId: string, body: any) => this.competitions.createCategory(competitionId, body);
    registerTeam = (categoryId: string, body: any) => this.competitions.registerTeam(categoryId, body);
    generateGroups = (categoryId: string, body: any) => this.competitions.generateGroups(categoryId, body);
    getEncounter = (id: string) => this.competitions.getEncounter(id);
    updateMatchScore = (matchId: string, body: any) => this.competitions.updateMatchScore(matchId, body);
    updateCompetition = (id: string, body: any) => this.competitions.updateCompetition(id, body);
    approveCompetition = (id: string, body: any) => this.competitions.approveCompetition(id, body);
    getCompetitionRoles = (id: string) => this.competitions.getCompetitionRoles(id);
    assignCompetitionRole = (id: string, body: any) => this.competitions.assignCompetitionRole(id, body);
    revokeCompetitionRole = (id: string, roleId: string) => this.competitions.revokeCompetitionRole(id, roleId);
    getCompetitionPlayers = (id: string) => this.competitions.getCompetitionPlayers(id);
    checkinCompetitionPlayer = (id: string, regId: string, body: any) => this.competitions.checkinCompetitionPlayer(id, regId, body);
    updateCompetitionPlayerPayment = (id: string, regId: string, body: any) => this.competitions.updateCompetitionPlayerPayment(id, regId, body);
    getCompetitionSpeakerCallouts = (id: string) => this.competitions.getCompetitionSpeakerCallouts(id);
    createCompetitionSpeakerCallout = (id: string, body: any) => this.competitions.createCompetitionSpeakerCallout(id, body);
    updateCompetitionSpeakerCallout = (id: string, calloutId: string, body: any) => this.competitions.updateCompetitionSpeakerCallout(id, calloutId, body);
    getCompetitionStatistics = (id: string) => this.competitions.getCompetitionStatistics(id);
    backupCompetition = (id: string) => this.competitions.backupCompetition(id);
    getCompetitionActions = (id: string) => this.competitions.getCompetitionActions(id);

    getCalendarEvents = (params?: Record<string, string>) => this.calendar.getCalendarEvents(params);
    createCalendarEvent = (body: any) => this.calendar.createCalendarEvent(body);

    sendBroadcast = (body: any) => this.messages.sendBroadcast(body);
    getMessages = () => this.messages.getMessages();

    getOAuthClients = (params?: { all?: boolean }) => this.oauth.getOAuthClients(params);
    createOAuthClient = (body: any) => this.oauth.createOAuthClient(body);
    approveOAuthClient = (clientId: string, body: any) => this.oauth.approveOAuthClient(clientId, body);
    updateOAuthClientRateLimit = (clientId: string, body: { customRateLimitEnabled: boolean; rateLimitCapacity?: number; rateLimitRefillRate?: number }) => this.oauth.updateOAuthClientRateLimit(clientId, body);
    revokeOAuthClient = (clientId: string) => this.oauth.revokeOAuthClient(clientId);
    deleteOAuthClient = (clientId: string) => this.oauth.deleteOAuthClient(clientId);
    requestOAuthToken = (body: any) => this.oauth.requestOAuthToken(body);
    fetchOAuthApi = (endpoint: string, token: string) => this.oauth.fetchOAuthApi(endpoint, token);

    getInvoices = (params?: Record<string, string>) => this.invoices.getInvoices(params);
    getInvoiceStats = (params?: Record<string, string>) => this.invoices.getInvoiceStats(params);
    getInvoice = (id: string) => this.invoices.getInvoice(id);
    createInvoice = (body: any) => this.invoices.createInvoice(body);
    updateInvoice = (id: string, body: any) => this.invoices.updateInvoice(id, body);
    sendInvoice = (id: string) => this.invoices.sendInvoice(id);
    markInvoicePaid = (id: string) => this.invoices.markInvoicePaid(id);
    deleteInvoice = (id: string) => this.invoices.deleteInvoice(id);
    syncInvoiceBexio = (id: string) => this.invoices.syncInvoiceBexio(id);
    getInvoiceQrBill = (id: string) => this.invoices.getInvoiceQrBill(id);
    getBexioConfig = (params?: Record<string, string>) => this.invoices.getBexioConfig(params);
    updateBexioConfig = (body: any) => this.invoices.updateBexioConfig(body);

    getAuditLogs = (params?: Record<string, string | number>) => this.audit.getAuditLogs(params);
    getAuditStats = (params?: Record<string, string>) => this.audit.getAuditStats(params);
    exportAuditLogs = (params?: Record<string, string>, format?: 'csv' | 'json') => this.audit.exportAuditLogs(params, format);

    getActiveNotices = () => this.notices.getActiveNotices();
    getAdminNotices = () => this.notices.getAdminNotices();
    createNotice = (body: any) => this.notices.createNotice(body);
    updateNotice = (id: string, body: any) => this.notices.updateNotice(id, body);
    deleteNotice = (id: string) => this.notices.deleteNotice(id);
    dismissNotice = (id: string) => this.notices.dismissNotice(id);

    getFaqs = (params?: { contextType?: string; contextId?: string; category?: string; search?: string }) => this.support.getFaqs(params);
    getSupportSubjects = (params?: { contextType?: string; contextId?: string }) => this.support.getSupportSubjects(params);
    submitSupportInquiry = (body: { name: string; email: string; subjectId?: string; customSubjectTitle?: string; contextType?: string; contextId?: string; message: string; faqsConfirmed: boolean }) => this.support.submitSupportInquiry(body);
    createFaq = (body: any) => this.support.createFaq(body);
    updateFaq = (id: string, body: any) => this.support.updateFaq(id, body);
    deleteFaq = (id: string) => this.support.deleteFaq(id);
    createSupportSubject = (body: any) => this.support.createSupportSubject(body);
    updateSupportSubject = (id: string, body: any) => this.support.updateSupportSubject(id, body);
    deleteSupportSubject = (id: string) => this.support.deleteSupportSubject(id);
    getSupportInquiries = (params?: { contextType?: string; contextId?: string; status?: string }) => this.support.getSupportInquiries(params);

    getAdminDashboard = () => this.admin.getAdminDashboard();
    getAdminSettings = () => this.admin.getAdminSettings();
    updateMailgunSettings = (body: { apiKey?: string; domain?: string; url?: string; fromEmail?: string; fromName?: string }) => this.admin.updateMailgunSettings(body);
    testMailgunSettings = (toEmail: string) => this.admin.testMailgunSettings(toEmail);
    updateSmtpSettings = (body: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean; from?: string }) => this.admin.updateSmtpSettings(body);
    testSmtpSettings = (toEmail: string) => this.admin.testSmtpSettings(toEmail);
    updateRateLimitSettings = (body: { enabled?: boolean; capacity?: number; refillRatePerSec?: number; blockAnonymousBots?: boolean }) => this.admin.updateRateLimitSettings(body);
    exportDatabase = () => this.admin.exportDatabase();
    importDatabase = (dumpData: any) => this.admin.importDatabase(dumpData);
}

export const api = new ApiClient();
export default api;

