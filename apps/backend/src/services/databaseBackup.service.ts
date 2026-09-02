import { prisma } from '../config/prisma';
import { config } from '../config/env';

export interface DatabaseDump {
    version: string;
    exportedAt: string;
    generator: string;
    tables: {
        users: any[];
        oAuthClients: any[];
        oAuthTokens: any[];
        associations: any[];
        associationHierarchies: any[];
        userAssociationRoles: any[];
        clubs: any[];
        clubAssociations: any[];
        userClubRoles: any[];
        seasons: any[];
        licenses: any[];
        competitions: any[];
        categories: any[];
        competitionGroups: any[];
        teams: any[];
        teamMembers: any[];
        teamCategoryRegistrations: any[];
        encounters: any[];
        matches: any[];
        groupStandings: any[];
        competitionUserRoles: any[];
        competitionSpeakerCallouts: any[];
        refresherCourses: any[];
        courseAttendances: any[];
        invoices: any[];
        invoiceLineItems: any[];
        bexioConfigs: any[];
        locations: any[];
        competitionLocations: any[];
        locationAssociations: any[];
        locationClubs: any[];
        locationUnits: any[];
        locationUnitReservations: any[];
        calendarEvents: any[];
        broadcastMessages: any[];
        messageRecipients: any[];
        adminNotices: any[];
        noticeDismissals: any[];
        faqItems: any[];
        supportSubjects: any[];
        supportInquiries: any[];
        systemSettings: any[];
        auditLogs: any[];
    };
    counts: Record<string, number>;
}

export class DatabaseBackupService {
    /**
     * Dumps the whole database into a structured JSON object
     */
    static async exportFullDatabase(): Promise<DatabaseDump> {
        console.log('[DatabaseBackup] 📦 Starting complete database export...');

        const [
            users,
            oAuthClients,
            oAuthTokens,
            associations,
            associationHierarchies,
            userAssociationRoles,
            clubs,
            clubAssociations,
            userClubRoles,
            seasons,
            licenses,
            competitions,
            categories,
            competitionGroups,
            teams,
            teamMembers,
            teamCategoryRegistrations,
            encounters,
            matches,
            groupStandings,
            competitionUserRoles,
            competitionSpeakerCallouts,
            refresherCourses,
            courseAttendances,
            invoices,
            invoiceLineItems,
            bexioConfigs,
            locations,
            competitionLocations,
            locationAssociations,
            locationClubs,
            locationUnits,
            locationUnitReservations,
            calendarEvents,
            broadcastMessages,
            messageRecipients,
            adminNotices,
            noticeDismissals,
            faqItems,
            supportSubjects,
            supportInquiries,
            systemSettings,
            auditLogs,
        ] = await Promise.all([
            prisma.user.findMany(),
            prisma.oAuthClient.findMany(),
            prisma.oAuthToken.findMany(),
            prisma.association.findMany(),
            prisma.associationHierarchy.findMany(),
            prisma.userAssociationRole.findMany(),
            prisma.club.findMany(),
            prisma.clubAssociation.findMany(),
            prisma.userClubRole.findMany(),
            prisma.season.findMany(),
            prisma.license.findMany(),
            prisma.competition.findMany(),
            prisma.category.findMany(),
            prisma.competitionGroup.findMany(),
            prisma.team.findMany(),
            prisma.teamMember.findMany(),
            prisma.teamCategoryRegistration.findMany(),
            prisma.encounter.findMany(),
            prisma.match.findMany(),
            prisma.groupStanding.findMany(),
            prisma.competitionUserRole.findMany(),
            prisma.competitionSpeakerCallout.findMany(),
            prisma.refresherCourse.findMany(),
            prisma.courseAttendance.findMany(),
            prisma.invoice.findMany(),
            prisma.invoiceLineItem.findMany(),
            prisma.bexioConfig.findMany(),
            prisma.location.findMany(),
            prisma.competitionLocation.findMany(),
            prisma.locationAssociation.findMany(),
            prisma.locationClub.findMany(),
            prisma.locationUnit.findMany(),
            prisma.locationUnitReservation.findMany(),
            prisma.calendarEvent.findMany(),
            prisma.broadcastMessage.findMany(),
            prisma.messageRecipient.findMany(),
            prisma.adminNotice.findMany(),
            prisma.noticeDismissal.findMany(),
            prisma.faqItem.findMany(),
            prisma.supportSubject.findMany(),
            prisma.supportInquiry.findMany(),
            prisma.systemSetting.findMany(),
            prisma.auditLog.findMany(),
        ]);

        const tables = {
            users,
            oAuthClients,
            oAuthTokens,
            associations,
            associationHierarchies,
            userAssociationRoles,
            clubs,
            clubAssociations,
            userClubRoles,
            seasons,
            licenses,
            competitions,
            categories,
            competitionGroups,
            teams,
            teamMembers,
            teamCategoryRegistrations,
            encounters,
            matches,
            groupStandings,
            competitionUserRoles,
            competitionSpeakerCallouts,
            refresherCourses,
            courseAttendances,
            invoices,
            invoiceLineItems,
            bexioConfigs,
            locations,
            competitionLocations,
            locationAssociations,
            locationClubs,
            locationUnits,
            locationUnitReservations,
            calendarEvents,
            broadcastMessages,
            messageRecipients,
            adminNotices,
            noticeDismissals,
            faqItems,
            supportSubjects,
            supportInquiries,
            systemSettings,
            auditLogs,
        };

        const counts: Record<string, number> = {};
        for (const [tableName, rows] of Object.entries(tables)) {
            counts[tableName] = rows.length;
        }

        console.log('[DatabaseBackup] ✅ Database export complete. Total tables:', Object.keys(tables).length);

        return {
            version: config.version,
            exportedAt: new Date().toISOString(),
            generator: 'AREENA Database Management Tool',
            tables,
            counts,
        };
    }

    /**
     * Imports a whole database dump from JSON, clearing existing records first
     */
    static async importFullDatabase(dump: DatabaseDump): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
        if (!dump || !dump.tables || typeof dump.tables !== 'object') {
            throw new Error('Invalid database dump format: "tables" object is required.');
        }

        console.log('[DatabaseBackup] 🔄 Starting full database restore / import...');
        const { tables } = dump;

        const importedCounts: Record<string, number> = {};

        // Run deletion and re-insertion in proper dependency order
        await prisma.$transaction(async (tx) => {
            // 1. CLEAR EXISTING DATA (Leaf-to-Root order)
            console.log('[DatabaseBackup] 🧹 Clearing existing data for clean import...');
            await tx.noticeDismissal.deleteMany();
            await tx.adminNotice.deleteMany();
            await tx.messageRecipient.deleteMany();
            await tx.broadcastMessage.deleteMany();
            await tx.supportInquiry.deleteMany();
            await tx.faqItem.deleteMany();
            await tx.supportSubject.deleteMany();
            await tx.locationUnitReservation.deleteMany();
            await tx.locationUnit.deleteMany();
            await tx.locationClub.deleteMany();
            await tx.locationAssociation.deleteMany();
            await tx.competitionLocation.deleteMany();
            await tx.location.deleteMany();
            await tx.calendarEvent.deleteMany();
            await tx.auditLog.deleteMany();
            await tx.invoiceLineItem.deleteMany();
            await tx.bexioConfig.deleteMany();
            await tx.invoice.deleteMany();
            await tx.courseAttendance.deleteMany();
            await tx.refresherCourse.deleteMany();
            await tx.match.deleteMany();
            await tx.groupStanding.deleteMany();
            await tx.encounter.deleteMany();
            await tx.teamCategoryRegistration.deleteMany();
            await tx.teamMember.deleteMany();
            await tx.team.deleteMany();
            await tx.competitionGroup.deleteMany();
            await tx.category.deleteMany();
            await tx.competitionSpeakerCallout.deleteMany();
            await tx.competitionUserRole.deleteMany();
            await tx.competition.deleteMany();
            await tx.license.deleteMany();
            await tx.season.deleteMany();
            await tx.userAssociationRole.deleteMany();
            await tx.userClubRole.deleteMany();
            await tx.associationHierarchy.deleteMany();
            await tx.clubAssociation.deleteMany();
            await tx.club.deleteMany();
            await tx.association.deleteMany();
            await tx.oAuthToken.deleteMany();
            await tx.oAuthClient.deleteMany();
            await tx.user.deleteMany();
            await tx.systemSetting.deleteMany();

            // 2. INSERT IN DEPENDENCY ORDER (Root-to-Leaf)
            console.log('[DatabaseBackup] 📥 Inserting imported records...');

            // Users & Auth
            if (tables.users?.length) {
                await tx.user.createMany({ data: tables.users });
                importedCounts.users = tables.users.length;
            }
            if (tables.oAuthClients?.length) {
                await tx.oAuthClient.createMany({ data: tables.oAuthClients });
                importedCounts.oAuthClients = tables.oAuthClients.length;
            }
            if (tables.oAuthTokens?.length) {
                await tx.oAuthToken.createMany({ data: tables.oAuthTokens });
                importedCounts.oAuthTokens = tables.oAuthTokens.length;
            }

            // System Settings
            if (tables.systemSettings?.length) {
                await tx.systemSetting.createMany({ data: tables.systemSettings });
                importedCounts.systemSettings = tables.systemSettings.length;
            }

            // Associations
            if (tables.associations?.length) {
                await tx.association.createMany({ data: tables.associations });
                importedCounts.associations = tables.associations.length;
            }
            if (tables.associationHierarchies?.length) {
                await tx.associationHierarchy.createMany({ data: tables.associationHierarchies });
                importedCounts.associationHierarchies = tables.associationHierarchies.length;
            }
            if (tables.userAssociationRoles?.length) {
                await tx.userAssociationRole.createMany({ data: tables.userAssociationRoles });
                importedCounts.userAssociationRoles = tables.userAssociationRoles.length;
            }

            // Clubs
            if (tables.clubs?.length) {
                await tx.club.createMany({ data: tables.clubs });
                importedCounts.clubs = tables.clubs.length;
            }
            if (tables.clubAssociations?.length) {
                await tx.clubAssociation.createMany({ data: tables.clubAssociations });
                importedCounts.clubAssociations = tables.clubAssociations.length;
            }
            if (tables.userClubRoles?.length) {
                await tx.userClubRole.createMany({ data: tables.userClubRoles });
                importedCounts.userClubRoles = tables.userClubRoles.length;
            }

            // Seasons
            if (tables.seasons?.length) {
                await tx.season.createMany({ data: tables.seasons });
                importedCounts.seasons = tables.seasons.length;
            }

            // Licenses & Courses
            if (tables.licenses?.length) {
                await tx.license.createMany({ data: tables.licenses });
                importedCounts.licenses = tables.licenses.length;
            }
            if (tables.refresherCourses?.length) {
                await tx.refresherCourse.createMany({ data: tables.refresherCourses });
                importedCounts.refresherCourses = tables.refresherCourses.length;
            }
            if (tables.courseAttendances?.length) {
                await tx.courseAttendance.createMany({ data: tables.courseAttendances });
                importedCounts.courseAttendances = tables.courseAttendances.length;
            }

            // Competitions & Matches
            if (tables.competitions?.length) {
                await tx.competition.createMany({ data: tables.competitions });
                importedCounts.competitions = tables.competitions.length;
            }
            if (tables.competitionUserRoles?.length) {
                await tx.competitionUserRole.createMany({ data: tables.competitionUserRoles });
                importedCounts.competitionUserRoles = tables.competitionUserRoles.length;
            }
            if (tables.competitionSpeakerCallouts?.length) {
                await tx.competitionSpeakerCallout.createMany({ data: tables.competitionSpeakerCallouts });
                importedCounts.competitionSpeakerCallouts = tables.competitionSpeakerCallouts.length;
            }
            if (tables.categories?.length) {
                await tx.category.createMany({ data: tables.categories });
                importedCounts.categories = tables.categories.length;
            }
            if (tables.competitionGroups?.length) {
                await tx.competitionGroup.createMany({ data: tables.competitionGroups });
                importedCounts.competitionGroups = tables.competitionGroups.length;
            }
            if (tables.teams?.length) {
                await tx.team.createMany({ data: tables.teams });
                importedCounts.teams = tables.teams.length;
            }
            if (tables.teamMembers?.length) {
                await tx.teamMember.createMany({ data: tables.teamMembers });
                importedCounts.teamMembers = tables.teamMembers.length;
            }
            if (tables.teamCategoryRegistrations?.length) {
                await tx.teamCategoryRegistration.createMany({ data: tables.teamCategoryRegistrations });
                importedCounts.teamCategoryRegistrations = tables.teamCategoryRegistrations.length;
            }
            if (tables.encounters?.length) {
                await tx.encounter.createMany({ data: tables.encounters });
                importedCounts.encounters = tables.encounters.length;
            }
            if (tables.matches?.length) {
                await tx.match.createMany({ data: tables.matches });
                importedCounts.matches = tables.matches.length;
            }
            if (tables.groupStandings?.length) {
                await tx.groupStanding.createMany({ data: tables.groupStandings });
                importedCounts.groupStandings = tables.groupStandings.length;
            }

            // Billing
            if (tables.invoices?.length) {
                await tx.invoice.createMany({ data: tables.invoices });
                importedCounts.invoices = tables.invoices.length;
            }
            if (tables.invoiceLineItems?.length) {
                await tx.invoiceLineItem.createMany({ data: tables.invoiceLineItems });
                importedCounts.invoiceLineItems = tables.invoiceLineItems.length;
            }
            if (tables.bexioConfigs?.length) {
                await tx.bexioConfig.createMany({ data: tables.bexioConfigs });
                importedCounts.bexioConfigs = tables.bexioConfigs.length;
            }

            // Locations
            if (tables.locations?.length) {
                await tx.location.createMany({ data: tables.locations });
                importedCounts.locations = tables.locations.length;
            }
            if (tables.competitionLocations?.length) {
                await tx.competitionLocation.createMany({ data: tables.competitionLocations });
                importedCounts.competitionLocations = tables.competitionLocations.length;
            }
            if (tables.locationAssociations?.length) {
                await tx.locationAssociation.createMany({ data: tables.locationAssociations });
                importedCounts.locationAssociations = tables.locationAssociations.length;
            }
            if (tables.locationClubs?.length) {
                await tx.locationClub.createMany({ data: tables.locationClubs });
                importedCounts.locationClubs = tables.locationClubs.length;
            }
            if (tables.locationUnits?.length) {
                await tx.locationUnit.createMany({ data: tables.locationUnits });
                importedCounts.locationUnits = tables.locationUnits.length;
            }
            if (tables.locationUnitReservations?.length) {
                await tx.locationUnitReservation.createMany({ data: tables.locationUnitReservations });
                importedCounts.locationUnitReservations = tables.locationUnitReservations.length;
            }

            // Communication & Events
            if (tables.calendarEvents?.length) {
                await tx.calendarEvent.createMany({ data: tables.calendarEvents });
                importedCounts.calendarEvents = tables.calendarEvents.length;
            }
            if (tables.broadcastMessages?.length) {
                await tx.broadcastMessage.createMany({ data: tables.broadcastMessages });
                importedCounts.broadcastMessages = tables.broadcastMessages.length;
            }
            if (tables.messageRecipients?.length) {
                await tx.messageRecipient.createMany({ data: tables.messageRecipients });
                importedCounts.messageRecipients = tables.messageRecipients.length;
            }
            if (tables.adminNotices?.length) {
                await tx.adminNotice.createMany({ data: tables.adminNotices });
                importedCounts.adminNotices = tables.adminNotices.length;
            }
            if (tables.noticeDismissals?.length) {
                await tx.noticeDismissal.createMany({ data: tables.noticeDismissals });
                importedCounts.noticeDismissals = tables.noticeDismissals.length;
            }

            // Support & FAQs
            if (tables.faqItems?.length) {
                await tx.faqItem.createMany({ data: tables.faqItems });
                importedCounts.faqItems = tables.faqItems.length;
            }
            if (tables.supportSubjects?.length) {
                await tx.supportSubject.createMany({ data: tables.supportSubjects });
                importedCounts.supportSubjects = tables.supportSubjects.length;
            }
            if (tables.supportInquiries?.length) {
                await tx.supportInquiry.createMany({ data: tables.supportInquiries });
                importedCounts.supportInquiries = tables.supportInquiries.length;
            }

            // Audit logs
            if (tables.auditLogs?.length) {
                await tx.auditLog.createMany({ data: tables.auditLogs });
                importedCounts.auditLogs = tables.auditLogs.length;
            }
        });

        console.log('[DatabaseBackup] ✅ Database import successfully completed!');
        return { success: true, importedCounts };
    }
}
