"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDatabase = clearDatabase;
exports.seedDemoDatabase = seedDemoDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../src/config/prisma");
const shared_1 = require("@areena/shared");
async function clearDatabase() {
    console.log('🧹 Clearing existing database records for clean seed...');
    // Delete dependent child tables first
    await prisma_1.prisma.noticeDismissal.deleteMany();
    await prisma_1.prisma.adminNotice.deleteMany();
    await prisma_1.prisma.messageRecipient.deleteMany();
    await prisma_1.prisma.broadcastMessage.deleteMany();
    await prisma_1.prisma.calendarEvent.deleteMany();
    await prisma_1.prisma.auditLog.deleteMany();
    await prisma_1.prisma.invoiceLineItem.deleteMany();
    await prisma_1.prisma.bexioConfig.deleteMany();
    await prisma_1.prisma.invoice.deleteMany();
    await prisma_1.prisma.courseAttendance.deleteMany();
    await prisma_1.prisma.refresherCourse.deleteMany();
    await prisma_1.prisma.match.deleteMany();
    await prisma_1.prisma.groupStanding.deleteMany();
    await prisma_1.prisma.encounter.deleteMany();
    await prisma_1.prisma.teamCategoryRegistration.deleteMany();
    await prisma_1.prisma.teamMember.deleteMany();
    await prisma_1.prisma.team.deleteMany();
    await prisma_1.prisma.competitionGroup.deleteMany();
    await prisma_1.prisma.category.deleteMany();
    await prisma_1.prisma.competition.deleteMany();
    await prisma_1.prisma.license.deleteMany();
    await prisma_1.prisma.season.deleteMany();
    await prisma_1.prisma.userAssociationRole.deleteMany();
    await prisma_1.prisma.userClubRole.deleteMany();
    await prisma_1.prisma.associationHierarchy.deleteMany();
    await prisma_1.prisma.clubAssociation.deleteMany();
    await prisma_1.prisma.club.deleteMany();
    await prisma_1.prisma.association.deleteMany();
    await prisma_1.prisma.oAuthToken.deleteMany();
    await prisma_1.prisma.oAuthClient.deleteMany();
    await prisma_1.prisma.user.deleteMany();
}
async function seedDemoDatabase() {
    console.log('🌱 Starting AREENA Comprehensive Demo Data Seeding...');
    await clearDatabase();
    const passwordHash = await bcryptjs_1.default.hash('Password123!', 10);
    // =========================================================================
    // 1. ORGANIZATIONS: ASSOCIATIONS (National & Regional)
    // =========================================================================
    console.log('  🏛️  Creating Associations & Regional Federations...');
    const sttfNational = await prisma_1.prisma.association.create({
        data: {
            name: 'Swiss Table Tennis Federation',
            shortName: 'STTF',
            code: 'STTF',
            level: shared_1.AssociationLevel.NATIONAL,
            isTopLevel: true,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 1,
            rules: {
                maxForeignersPerTeam: 2,
                allowTCardDualRegistration: true,
                requireRefereeCourseForSenior: true,
                refresherCourseValidityMonths: 24,
            },
        },
    });
    const sttfOst = await prisma_1.prisma.association.create({
        data: {
            name: 'STTF Ostschweiz (OTTV)',
            shortName: 'OTTV',
            code: 'STTF-OST',
            level: shared_1.AssociationLevel.REGIONAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 2,
        },
    });
    const sttfRomandie = await prisma_1.prisma.association.create({
        data: {
            name: 'Association Romande de Tennis de Table (ARTT)',
            shortName: 'ARTT',
            code: 'STTF-WEST',
            level: shared_1.AssociationLevel.REGIONAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 3,
        },
    });
    // Establish Federation Hierarchy
    await prisma_1.prisma.associationHierarchy.createMany({
        data: [
            { parentId: sttfNational.id, childId: sttfOst.id },
            { parentId: sttfNational.id, childId: sttfRomandie.id },
        ],
    });
    // Seasons
    const currentSeason = await prisma_1.prisma.season.create({
        data: {
            associationId: sttfNational.id,
            name: 'Season 2025 / 2026',
            startDate: new Date('2025-08-01T00:00:00Z'),
            endDate: new Date('2026-07-31T23:59:59Z'),
            isCurrent: true,
        },
    });
    // =========================================================================
    // 2. CLUBS
    // =========================================================================
    console.log('  🏓 Creating Clubs & Association Affiliations...');
    const clubZurich = await prisma_1.prisma.club.create({
        data: {
            name: 'Tischtennisclub Zürich-Affoltern',
            code: 'TTC-ZH',
            address: 'Fronwaldstrasse 115',
            city: 'Zürich',
            postalCode: '8046',
            country: 'Switzerland',
            email: 'info@ttc-zurich.ch',
            phone: '+41 44 371 90 20',
            website: 'https://ttc-zurich.ch',
        },
    });
    const clubBern = await prisma_1.prisma.club.create({
        data: {
            name: 'TTC Bern Capitals',
            code: 'TTC-BE',
            address: 'Brunnmattstrasse 20',
            city: 'Bern',
            postalCode: '3007',
            country: 'Switzerland',
            email: 'contact@ttc-bern.ch',
            phone: '+41 31 381 44 55',
            website: 'https://ttc-bern.ch',
        },
    });
    const clubGeneva = await prisma_1.prisma.club.create({
        data: {
            name: 'Club de Tennis de Table de Genève',
            code: 'CTTG-GE',
            address: 'Rue de Vermont 37',
            city: 'Genève',
            postalCode: '1202',
            country: 'Switzerland',
            email: 'secretaire@ctt-geneve.ch',
            phone: '+41 22 734 56 78',
            website: 'https://ctt-geneve.ch',
        },
    });
    const clubBasel = await prisma_1.prisma.club.create({
        data: {
            name: 'TTC Basel Rheinfelden',
            code: 'TTC-BS',
            address: 'St. Alban-Vorstadt 12',
            city: 'Basel',
            postalCode: '4052',
            country: 'Switzerland',
            email: 'spielbetrieb@ttc-basel.ch',
            phone: '+41 61 272 11 00',
            website: 'https://ttc-basel.ch',
        },
    });
    // Link Clubs to Associations
    await prisma_1.prisma.clubAssociation.createMany({
        data: [
            { clubId: clubZurich.id, associationId: sttfNational.id },
            { clubId: clubZurich.id, associationId: sttfOst.id },
            { clubId: clubBern.id, associationId: sttfNational.id },
            { clubId: clubGeneva.id, associationId: sttfNational.id },
            { clubId: clubGeneva.id, associationId: sttfRomandie.id },
            { clubId: clubBasel.id, associationId: sttfNational.id },
            { clubId: clubBasel.id, associationId: sttfOst.id },
        ],
    });
    // =========================================================================
    // 3. USERS & DEMO ACCOUNTS
    // =========================================================================
    console.log('  👥 Creating Role-Based Demo User Accounts...');
    // 3.1 Platform Super Admin
    const userSuperAdmin = await prisma_1.prisma.user.create({
        data: {
            email: 'admin@areena.ch',
            passwordHash,
            firstName: 'Super',
            lastName: 'Administrator',
            phone: '+41 79 100 00 01',
            street: 'Bundesplatz 3',
            postalCode: '3005',
            city: 'Bern',
            isSuperAdmin: true,
            eloPoints: 1200,
        },
    });
    // 3.2 National Federation President / Admin
    const userSttfPresident = await prisma_1.prisma.user.create({
        data: {
            email: 'president.sttf@areena.ch',
            passwordHash,
            firstName: 'Beat',
            lastName: 'Hirschi',
            phone: '+41 79 200 10 02',
            street: 'Haus des Sports, Talgut-Zentrum 27',
            postalCode: '3063',
            city: 'Ittigen',
            isSuperAdmin: false,
            eloPoints: 1450,
            rank: 45,
        },
    });
    await prisma_1.prisma.userAssociationRole.create({
        data: {
            userId: userSttfPresident.id,
            associationId: sttfNational.id,
            role: 'PRESIDENT',
        },
    });
    // 3.3 Regional Association Admin
    const userRegionalAdmin = await prisma_1.prisma.user.create({
        data: {
            email: 'regional.sttf.east@areena.ch',
            passwordHash,
            firstName: 'Urs',
            lastName: 'Bischofberger',
            phone: '+41 79 300 20 03',
            street: 'Wassergasse 14',
            postalCode: '9000',
            city: 'St. Gallen',
            isSuperAdmin: false,
            eloPoints: 1300,
        },
    });
    await prisma_1.prisma.userAssociationRole.create({
        data: {
            userId: userRegionalAdmin.id,
            associationId: sttfOst.id,
            role: 'ADMIN',
        },
    });
    // 3.4 Club Admins
    const userClubZurichAdmin = await prisma_1.prisma.user.create({
        data: {
            email: 'club.zurich@areena.ch',
            passwordHash,
            firstName: 'Thomas',
            lastName: 'Müller',
            phone: '+41 79 400 30 04',
            street: 'Limmatquai 55',
            postalCode: '8001',
            city: 'Zürich',
            isSuperAdmin: false,
            eloPoints: 1520,
        },
    });
    await prisma_1.prisma.userClubRole.create({
        data: {
            userId: userClubZurichAdmin.id,
            clubId: clubZurich.id,
            role: 'ADMIN',
        },
    });
    const userClubBernAdmin = await prisma_1.prisma.user.create({
        data: {
            email: 'club.bern@areena.ch',
            passwordHash,
            firstName: 'Adrian',
            lastName: 'Wenger',
            phone: '+41 79 400 30 05',
            street: 'Kramgasse 25',
            postalCode: '3011',
            city: 'Bern',
            isSuperAdmin: false,
            eloPoints: 1480,
        },
    });
    await prisma_1.prisma.userClubRole.create({
        data: {
            userId: userClubBernAdmin.id,
            clubId: clubBern.id,
            role: 'ADMIN',
        },
    });
    // 3.5 Certified Coach & Course Instructor
    const userCoachHans = await prisma_1.prisma.user.create({
        data: {
            email: 'coach.hans@areena.ch',
            passwordHash,
            firstName: 'Hans',
            lastName: 'Meier',
            phone: '+41 79 500 40 06',
            street: 'Sportweg 7',
            postalCode: '8050',
            city: 'Zürich',
            isSuperAdmin: false,
            eloPoints: 1750,
            licenseId: '126001',
        },
    });
    await prisma_1.prisma.userClubRole.create({
        data: {
            userId: userCoachHans.id,
            clubId: clubZurich.id,
            role: 'COACH',
        },
    });
    // 3.6 Certified Head Referee
    const userRefereeSandra = await prisma_1.prisma.user.create({
        data: {
            email: 'referee.sandra@areena.ch',
            passwordHash,
            firstName: 'Sandra',
            lastName: 'Gerber',
            phone: '+41 79 600 50 07',
            street: 'Murtenstrasse 18',
            postalCode: '3008',
            city: 'Bern',
            isSuperAdmin: false,
            eloPoints: 1390,
            licenseId: '126002',
        },
    });
    // 3.7 Elite Athletes & Players
    const userPlayerMarco = await prisma_1.prisma.user.create({
        data: {
            email: 'player.marco@areena.ch',
            passwordHash,
            firstName: 'Marco',
            lastName: 'Bernasconi',
            phone: '+41 79 700 60 08',
            street: 'Via Nassa 22',
            postalCode: '6900',
            city: 'Lugano',
            isSuperAdmin: false,
            eloPoints: 1850,
            rank: 4,
            licenseId: '126003',
        },
    });
    const userPlayerElena = await prisma_1.prisma.user.create({
        data: {
            email: 'player.elena@areena.ch',
            passwordHash,
            firstName: 'Elena',
            lastName: 'Rossi',
            phone: '+41 79 800 70 09',
            street: 'Avenue de Cour 12',
            postalCode: '1007',
            city: 'Lausanne',
            isSuperAdmin: false,
            eloPoints: 1620,
            rank: 12,
            licenseId: '126004',
        },
    });
    const userPlayerLucas = await prisma_1.prisma.user.create({
        data: {
            email: 'player.junior.lucas@areena.ch',
            passwordHash,
            firstName: 'Lucas',
            lastName: 'Weber',
            phone: '+41 79 900 80 10',
            street: 'Delsbergerallee 4',
            postalCode: '4053',
            city: 'Basel',
            isSuperAdmin: false,
            eloPoints: 1340,
            rank: 28,
            licenseId: '126005',
        },
    });
    const userPlayerDavid = await prisma_1.prisma.user.create({
        data: {
            email: 'player.david@areena.ch',
            passwordHash,
            firstName: 'David',
            lastName: 'Schneider',
            phone: '+41 79 911 00 11',
            street: 'Marktgasse 8',
            postalCode: '3011',
            city: 'Bern',
            isSuperAdmin: false,
            eloPoints: 1710,
            rank: 9,
            licenseId: '126006',
        },
    });
    // =========================================================================
    // 4. LICENSES
    // =========================================================================
    console.log('  🪪  Issuing Licenses (Players, Coaches, Referees)...');
    const licenseValidFrom = new Date('2025-08-01T00:00:00Z');
    const licenseValidUntil = new Date('2026-07-31T23:59:59Z');
    // Coach License
    await prisma_1.prisma.license.create({
        data: {
            userId: userCoachHans.id,
            type: shared_1.LicenseType.COACH,
            status: shared_1.LicenseStatus.APPROVED,
            clubId: clubZurich.id,
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            validFrom: licenseValidFrom,
            validUntil: licenseValidUntil,
            appliedByUserId: userCoachHans.id,
            approvedByUserId: userSttfPresident.id,
        },
    });
    // Referee License
    await prisma_1.prisma.license.create({
        data: {
            userId: userRefereeSandra.id,
            type: shared_1.LicenseType.REFEREE,
            status: shared_1.LicenseStatus.APPROVED,
            clubId: clubBern.id,
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            validFrom: licenseValidFrom,
            validUntil: licenseValidUntil,
            appliedByUserId: userRefereeSandra.id,
            approvedByUserId: userSttfPresident.id,
        },
    });
    // Player Licenses
    const playerLicenses = [
        {
            userId: userPlayerMarco.id,
            type: shared_1.LicenseType.PLAYER_REGULAR,
            clubId: clubZurich.id,
            status: shared_1.LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerElena.id,
            type: shared_1.LicenseType.PLAYER_WOMEN,
            clubId: clubGeneva.id,
            status: shared_1.LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerLucas.id,
            type: shared_1.LicenseType.PLAYER_JUNIOR,
            clubId: clubBasel.id,
            status: shared_1.LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerDavid.id,
            type: shared_1.LicenseType.PLAYER_REGULAR,
            clubId: clubBern.id,
            status: shared_1.LicenseStatus.APPROVED,
        },
    ];
    for (const lic of playerLicenses) {
        await prisma_1.prisma.license.create({
            data: {
                userId: lic.userId,
                type: lic.type,
                status: lic.status,
                clubId: lic.clubId,
                associationId: sttfNational.id,
                seasonId: currentSeason.id,
                validFrom: licenseValidFrom,
                validUntil: licenseValidUntil,
                appliedByUserId: lic.userId,
                approvedByUserId: userSttfPresident.id,
            },
        });
    }
    // =========================================================================
    // 5. REFRESHER COURSES & CLINICS
    // =========================================================================
    console.log('  🎓 Setting up Refresher Courses & Seminars...');
    const coachCourse = await prisma_1.prisma.refresherCourse.create({
        data: {
            associationId: sttfNational.id,
            title: 'Swiss National Coach Recertification Workshop 2026',
            type: shared_1.CourseType.COACH_REFRESHER,
            instructorId: userCoachHans.id,
            location: 'National Sports Center Magglingen, Hall 3',
            date: new Date('2026-09-15T09:00:00Z'),
            durationHours: 6,
            validityExtensionMonths: 24,
        },
    });
    const refereeCourse = await prisma_1.prisma.refresherCourse.create({
        data: {
            associationId: sttfNational.id,
            title: 'Elite Umpire Level 2 Refresher Seminar',
            type: shared_1.CourseType.REFEREE_REFRESHER,
            instructorId: userRefereeSandra.id,
            location: 'Haus des Sports, Ittigen / Zoom Hybrid',
            date: new Date('2026-10-05T18:30:00Z'),
            durationHours: 4,
            validityExtensionMonths: 12,
        },
    });
    // Enroll participants
    await prisma_1.prisma.courseAttendance.createMany({
        data: [
            {
                courseId: coachCourse.id,
                userId: userClubBernAdmin.id,
                attested: true,
                attestedAt: new Date(),
                attestedByUserId: userCoachHans.id,
                notes: 'Successfully completed high-performance youth coaching module.',
            },
            {
                courseId: refereeCourse.id,
                userId: userRefereeSandra.id,
                attested: true,
                attestedAt: new Date(),
                attestedByUserId: userRefereeSandra.id,
                notes: 'Refresher update on 2026 international service regulations.',
            },
        ],
    });
    // =========================================================================
    // 6. TEAMS & CLUB ROSTERS
    // =========================================================================
    console.log('  🛡️  Creating Teams & Rosters...');
    const teamZurichElite = await prisma_1.prisma.team.create({
        data: {
            name: 'TTC Zürich 1 (NLA)',
            clubId: clubZurich.id,
        },
    });
    const teamBernElite = await prisma_1.prisma.team.create({
        data: {
            name: 'TTC Bern Capitals 1 (NLA)',
            clubId: clubBern.id,
        },
    });
    const teamGenevaElite = await prisma_1.prisma.team.create({
        data: {
            name: 'CTT Genève 1 (NLA)',
            clubId: clubGeneva.id,
        },
    });
    const teamBaselElite = await prisma_1.prisma.team.create({
        data: {
            name: 'TTC Basel 1 (NLA)',
            clubId: clubBasel.id,
        },
    });
    // Add members to teams
    await prisma_1.prisma.teamMember.createMany({
        data: [
            { teamId: teamZurichElite.id, userId: userPlayerMarco.id, role: 'CAPTAIN' },
            { teamId: teamBernElite.id, userId: userPlayerDavid.id, role: 'CAPTAIN' },
            { teamId: teamGenevaElite.id, userId: userPlayerElena.id, role: 'CAPTAIN' },
            { teamId: teamBaselElite.id, userId: userPlayerLucas.id, role: 'CAPTAIN' },
        ],
    });
    // =========================================================================
    // 7. COMPETITIONS, TOURNAMENTS & ENCOUNTERS
    // =========================================================================
    console.log('  🏆 Creating Tournaments, Categories, Fixtures & Match Results...');
    // 7.1 Tournament: Swiss National Championship 2026
    const swissChampionship = await prisma_1.prisma.competition.create({
        data: {
            name: 'Swiss National Table Tennis Championship 2026',
            type: shared_1.CompetitionType.TOURNAMENT,
            description: 'The premier national championship tournament bringing together the top licensed athletes.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2026-06-12T08:00:00Z'),
            endDate: new Date('2026-06-14T19:00:00Z'),
            location: 'Saalsporthalle, Zürich',
            status: shared_1.CompetitionStatus.IN_PROGRESS,
        },
    });
    const menEliteCategory = await prisma_1.prisma.category.create({
        data: {
            competitionId: swissChampionship.id,
            name: "Men's Elite Singles (A-Series)",
            teamSize: 1,
            minElo: 1500,
            genderRestriction: shared_1.GenderRestriction.MALE_ONLY,
            roundsPerGroup: 1,
        },
    });
    const groupA = await prisma_1.prisma.competitionGroup.create({
        data: {
            categoryId: menEliteCategory.id,
            name: 'Quarter-Finals Group A',
        },
    });
    // Register teams/athletes to category
    await prisma_1.prisma.teamCategoryRegistration.createMany({
        data: [
            { categoryId: menEliteCategory.id, teamId: teamZurichElite.id },
            { categoryId: menEliteCategory.id, teamId: teamBernElite.id },
        ],
    });
    // Create Encounter Fixture
    const encounterFinal = await prisma_1.prisma.encounter.create({
        data: {
            categoryId: menEliteCategory.id,
            groupId: groupA.id,
            round: 1,
            scheduledAt: new Date('2026-06-14T15:00:00Z'),
            location: 'Saalsporthalle Center Court',
            homeTeamId: teamZurichElite.id,
            awayTeamId: teamBernElite.id,
            homeScore: 3,
            awayScore: 1,
            status: shared_1.EncounterStatus.FINISHED,
        },
    });
    // Create Match Results with Sets
    await prisma_1.prisma.match.create({
        data: {
            encounterId: encounterFinal.id,
            orderIndex: 1,
            matchType: shared_1.MatchType.SINGLE,
            label: 'Men Singles #1: Marco Bernasconi vs David Schneider',
            homePlayer1Id: userPlayerMarco.id,
            awayPlayer1Id: userPlayerDavid.id,
            homeWonSets: 3,
            awayWonSets: 1,
            winner: shared_1.MatchWinner.HOME,
            status: shared_1.EncounterStatus.FINISHED,
            sets: [
                { setNumber: 1, homeScore: 11, awayScore: 8 },
                { setNumber: 2, homeScore: 9, awayScore: 11 },
                { setNumber: 3, homeScore: 11, awayScore: 7 },
                { setNumber: 4, homeScore: 11, awayScore: 9 },
            ],
        },
    });
    // 7.2 League: Swiss National League A
    const nationalLeagueA = await prisma_1.prisma.competition.create({
        data: {
            name: 'Swiss National League A (NLA) 2025/2026',
            type: shared_1.CompetitionType.LEAGUE,
            description: 'Official Swiss National League A championship season.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2025-09-01T00:00:00Z'),
            endDate: new Date('2026-05-30T00:00:00Z'),
            status: shared_1.CompetitionStatus.IN_PROGRESS,
        },
    });
    // =========================================================================
    // 8. BILLING & INVOICES
    // =========================================================================
    console.log('  💳 Creating Invoices & Line Items...');
    const invoiceMembership = await prisma_1.prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-2026-001',
            associationId: sttfNational.id,
            targetType: shared_1.InvoiceTargetType.MEMBER_CLUB,
            recipientClubId: clubZurich.id,
            recipientName: 'TTC Zürich-Affoltern',
            recipientEmail: 'info@ttc-zurich.ch',
            recipientAddress: 'Fronwaldstrasse 115, 8046 Zürich',
            status: shared_1.InvoiceStatus.PAID,
            category: shared_1.InvoiceCategory.MEMBERSHIP_FEE,
            currency: 'CHF',
            subtotal: 750.0,
            taxRate: 8.1,
            taxAmount: 60.75,
            totalAmount: 810.75,
            dueDate: new Date('2026-03-31T00:00:00Z'),
            paidAt: new Date('2026-03-15T10:00:00Z'),
            notes: 'Annual National Federation Affiliation Fee 2026.',
            terms: 'Net 30 days from invoice date.',
            bexioSyncStatus: 'SYNCED',
        },
    });
    await prisma_1.prisma.invoiceLineItem.create({
        data: {
            invoiceId: invoiceMembership.id,
            position: 1,
            description: 'Annual Federation Club Affiliation 2026',
            quantity: 1,
            unitPrice: 750.0,
            totalPrice: 750.0,
            taxRate: 8.1,
        },
    });
    const invoiceEntry = await prisma_1.prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-2026-002',
            associationId: sttfNational.id,
            targetType: shared_1.InvoiceTargetType.MEMBER_CLUB,
            recipientClubId: clubBern.id,
            recipientName: 'TTC Bern Capitals',
            recipientEmail: 'contact@ttc-bern.ch',
            recipientAddress: 'Brunnmattstrasse 20, 3007 Bern',
            status: shared_1.InvoiceStatus.SENT,
            category: shared_1.InvoiceCategory.COMPETITION_ENTRY,
            currency: 'CHF',
            subtotal: 240.0,
            taxRate: 0.0,
            taxAmount: 0.0,
            totalAmount: 240.0,
            dueDate: new Date(Date.now() + 86400000 * 14),
            notes: 'Swiss National Championship 2026 Team Registration Entry Fees.',
        },
    });
    await prisma_1.prisma.invoiceLineItem.create({
        data: {
            invoiceId: invoiceEntry.id,
            position: 1,
            description: 'Team Entry: Swiss National Championship 2026',
            quantity: 2,
            unitPrice: 120.0,
            totalPrice: 240.0,
        },
    });
    // =========================================================================
    // 9. SYSTEM ADMIN NOTICES (BANNER & MODAL)
    // =========================================================================
    console.log('  📢 Publishing System Announcements & Admin Notices...');
    await prisma_1.prisma.adminNotice.create({
        data: {
            title: 'Welcome to the AREENA Sports Federation Platform Demo',
            content: 'Explore the multi-tier Swiss federation ecosystem: inspect tournament encounters, review license approvals, manage club rosters, and test role-based access.',
            type: shared_1.NoticeType.INFO,
            displayMode: shared_1.NoticeDisplayMode.BANNER,
            targetGroup: shared_1.NoticeTargetGroup.ALL,
            isDismissible: true,
            createdById: userSuperAdmin.id,
            priority: 10,
        },
    });
    // =========================================================================
    // 10. CALENDAR EVENTS & AUDIT LOGS
    // =========================================================================
    console.log('  📅 Creating Calendar Events & Governance Audit Logs...');
    await prisma_1.prisma.calendarEvent.createMany({
        data: [
            {
                title: 'Swiss National Championship 2026 Kickoff',
                description: 'Opening round and group stages at Saalsporthalle Zürich.',
                eventType: shared_1.EventType.TOURNAMENT,
                associationId: sttfNational.id,
                competitionId: swissChampionship.id,
                startDate: new Date('2026-06-12T08:00:00Z'),
                endDate: new Date('2026-06-14T19:00:00Z'),
                location: 'Saalsporthalle, Zürich',
                isPublic: true,
            },
            {
                title: 'National Coach Recertification Workshop',
                description: 'Mandatory continuing education workshop for certified coaches.',
                eventType: shared_1.EventType.REFRESHER_COURSE,
                associationId: sttfNational.id,
                startDate: new Date('2026-09-15T09:00:00Z'),
                endDate: new Date('2026-09-15T15:00:00Z'),
                location: 'National Sports Center Magglingen',
                isPublic: true,
            },
        ],
    });
    await prisma_1.prisma.auditLog.createMany({
        data: [
            {
                userId: userSuperAdmin.id,
                userEmail: userSuperAdmin.email,
                userName: 'Super Administrator',
                action: 'SYSTEM_BOOTSTRAP_INITIALIZE',
                category: shared_1.AuditCategory.GOVERNANCE,
                description: 'Initialized Swiss Table Tennis Federation (STTF) primary organization and demo seeds.',
                status: 'SUCCESS',
            },
            {
                userId: userSttfPresident.id,
                userEmail: userSttfPresident.email,
                userName: 'Beat Hirschi',
                action: 'LICENSE_BATCH_APPROVE',
                category: shared_1.AuditCategory.LICENSING,
                description: 'Approved seasonal licenses for TTC Zürich, TTC Bern, TTC Geneva, and TTC Basel.',
                status: 'SUCCESS',
            },
        ],
    });
    console.log('\n✨ AREENA Demo Database Seeding Completed Successfully!\n');
    console.log('📋 Demo Login Accounts Created (All passwords: Password123!):');
    console.log('  • Super Admin:       admin@areena.ch');
    console.log('  • STTF President:    president.sttf@areena.ch');
    console.log('  • Regional Admin:    regional.sttf.east@areena.ch');
    console.log('  • Club Admin (ZH):   club.zurich@areena.ch');
    console.log('  • Club Admin (BE):   club.bern@areena.ch');
    console.log('  • Head Coach:        coach.hans@areena.ch');
    console.log('  • Head Referee:      referee.sandra@areena.ch');
    console.log('  • Elite Athlete:     player.marco@areena.ch');
    console.log('  • Women Player:      player.elena@areena.ch');
    console.log('  • Junior Player:     player.junior.lucas@areena.ch');
}
// Allow direct execution via CLI (e.g. `ts-node prisma/seed.ts`)
if (require.main === module) {
    seedDemoDatabase()
        .then(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    })
        .catch(async (e) => {
        console.error('❌ Error during demo seeding:', e);
        await prisma_1.prisma.$disconnect();
        process.exit(1);
    });
}
