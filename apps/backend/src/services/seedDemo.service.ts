import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import {
    AssociationLevel,
    LicenseType,
    LicenseStatus,
    CourseType,
    CompetitionType,
    CompetitionStatus,
    GenderRestriction,
    EncounterStatus,
    MatchType,
    MatchWinner,
    InvoiceStatus,
    InvoiceCategory,
    InvoiceTargetType,
    NoticeType,
    NoticeDisplayMode,
    NoticeTargetGroup,
    EventType,
    AuditCategory,
} from '@areena/shared';

export async function clearDatabase() {
    console.log('🧹 Clearing existing database records for clean seed...');
    await prisma.noticeDismissal.deleteMany();
    await prisma.adminNotice.deleteMany();
    await prisma.messageRecipient.deleteMany();
    await prisma.broadcastMessage.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.bexioConfig.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.courseAttendance.deleteMany();
    await prisma.refresherCourse.deleteMany();
    await prisma.match.deleteMany();
    await prisma.groupStanding.deleteMany();
    await prisma.encounter.deleteMany();
    await prisma.teamCategoryRegistration.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.competitionGroup.deleteMany();
    await prisma.category.deleteMany();
    await prisma.competition.deleteMany();
    await prisma.license.deleteMany();
    await prisma.season.deleteMany();
    await prisma.userAssociationRole.deleteMany();
    await prisma.userClubRole.deleteMany();
    await prisma.associationHierarchy.deleteMany();
    await prisma.clubAssociation.deleteMany();
    await prisma.club.deleteMany();
    await prisma.association.deleteMany();
    await prisma.oAuthToken.deleteMany();
    await prisma.oAuthClient.deleteMany();
    await prisma.user.deleteMany();
}

export async function seedDemoDatabase() {
    console.log('🌱 Starting AREENA Comprehensive Demo Data Seeding...');

    await clearDatabase();

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. ASSOCIATIONS
    console.log('  🏛️  Creating Associations & Regional Federations...');
    const sttfNational = await prisma.association.create({
        data: {
            name: 'Swiss Table Tennis Federation',
            shortName: 'STTF',
            code: 'STTF',
            level: AssociationLevel.NATIONAL,
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

    const sttfOst = await prisma.association.create({
        data: {
            name: 'STTF Ostschweiz (OTTV)',
            shortName: 'OTTV',
            code: 'STTF-OST',
            level: AssociationLevel.REGIONAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 2,
        },
    });

    const sttfRomandie = await prisma.association.create({
        data: {
            name: 'Association Romande de Tennis de Table (ARTT)',
            shortName: 'ARTT',
            code: 'STTF-WEST',
            level: AssociationLevel.REGIONAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 3,
        },
    });

    await prisma.associationHierarchy.createMany({
        data: [
            { parentId: sttfNational.id, childId: sttfOst.id },
            { parentId: sttfNational.id, childId: sttfRomandie.id },
        ],
    });

    const currentSeason = await prisma.season.create({
        data: {
            associationId: sttfNational.id,
            name: 'Season 2025 / 2026',
            startDate: new Date('2025-08-01T00:00:00Z'),
            endDate: new Date('2026-07-31T23:59:59Z'),
            isCurrent: true,
        },
    });

    // 2. CLUBS
    console.log('  🏓 Creating Clubs & Association Affiliations...');
    const clubZurich = await prisma.club.create({
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

    const clubBern = await prisma.club.create({
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

    const clubGeneva = await prisma.club.create({
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

    const clubBasel = await prisma.club.create({
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

    await prisma.clubAssociation.createMany({
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

    // 3. USERS & DEMO ACCOUNTS
    console.log('  👥 Creating Role-Based Demo User Accounts...');
    const userSuperAdmin = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1200,
        },
    });

    const userSttfPresident = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1450,
            rank: 45,
        },
    });

    await prisma.userAssociationRole.create({
        data: {
            userId: userSttfPresident.id,
            associationId: sttfNational.id,
            role: 'PRESIDENT',
        },
    });

    const userRegionalAdmin = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1300,
        },
    });

    await prisma.userAssociationRole.create({
        data: {
            userId: userRegionalAdmin.id,
            associationId: sttfOst.id,
            role: 'ADMIN',
        },
    });

    const userClubZurichAdmin = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1520,
        },
    });

    await prisma.userClubRole.create({
        data: {
            userId: userClubZurichAdmin.id,
            clubId: clubZurich.id,
            role: 'ADMIN',
        },
    });

    const userClubBernAdmin = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1480,
        },
    });

    await prisma.userClubRole.create({
        data: {
            userId: userClubBernAdmin.id,
            clubId: clubBern.id,
            role: 'ADMIN',
        },
    });

    const userCoachHans = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1750,
            licenseId: '126001',
        },
    });

    await prisma.userClubRole.create({
        data: {
            userId: userCoachHans.id,
            clubId: clubZurich.id,
            role: 'COACH',
        },
    });

    const userRefereeSandra = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1390,
            licenseId: '126002',
        },
    });

    const userPlayerMarco = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1850,
            rank: 4,
            licenseId: '126003',
        },
    });

    const userPlayerElena = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1620,
            rank: 12,
            licenseId: '126004',
        },
    });

    const userPlayerLucas = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1340,
            rank: 28,
            licenseId: '126005',
        },
    });

    const userPlayerDavid = await prisma.user.create({
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
            emailVerified: true,
            eloPoints: 1710,
            rank: 9,
            licenseId: '126006',
        },
    });

    const userPending = await prisma.user.create({
        data: {
            email: 'test.pending@areena.ch',
            passwordHash,
            firstName: 'Simon',
            lastName: 'Keller',
            phone: '+41 79 999 88 77',
            street: 'Bahnhofstrasse 1',
            postalCode: '6003',
            city: 'Luzern',
            isSuperAdmin: false,
            emailVerified: false,
            emailVerificationToken: 'demo-sample-verification-token-2026',
            emailVerificationExpires: new Date(Date.now() + 86400000),
            eloPoints: 1000,
        },
    });

    // 4. LICENSES
    console.log('  🪪  Issuing Licenses (Players, Coaches, Referees)...');
    const licenseValidFrom = new Date('2025-08-01T00:00:00Z');
    const licenseValidUntil = new Date('2026-07-31T23:59:59Z');

    await prisma.license.create({
        data: {
            userId: userCoachHans.id,
            type: LicenseType.COACH,
            status: LicenseStatus.APPROVED,
            clubId: clubZurich.id,
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            validFrom: licenseValidFrom,
            validUntil: licenseValidUntil,
            appliedByUserId: userCoachHans.id,
            approvedByUserId: userSttfPresident.id,
        },
    });

    await prisma.license.create({
        data: {
            userId: userRefereeSandra.id,
            type: LicenseType.REFEREE,
            status: LicenseStatus.APPROVED,
            clubId: clubBern.id,
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            validFrom: licenseValidFrom,
            validUntil: licenseValidUntil,
            appliedByUserId: userRefereeSandra.id,
            approvedByUserId: userSttfPresident.id,
        },
    });

    const playerLicenses = [
        {
            userId: userPlayerMarco.id,
            type: LicenseType.PLAYER_REGULAR,
            clubId: clubZurich.id,
            status: LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerElena.id,
            type: LicenseType.PLAYER_WOMEN,
            clubId: clubGeneva.id,
            status: LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerLucas.id,
            type: LicenseType.PLAYER_JUNIOR,
            clubId: clubBasel.id,
            status: LicenseStatus.APPROVED,
        },
        {
            userId: userPlayerDavid.id,
            type: LicenseType.PLAYER_REGULAR,
            clubId: clubBern.id,
            status: LicenseStatus.APPROVED,
        },
    ];

    for (const lic of playerLicenses) {
        await prisma.license.create({
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

    // 5. REFRESHER COURSES
    console.log('  🎓 Setting up Refresher Courses & Seminars...');
    const coachCourse = await prisma.refresherCourse.create({
        data: {
            associationId: sttfNational.id,
            title: 'Swiss National Coach Recertification Workshop 2026',
            type: CourseType.COACH_REFRESHER,
            instructorId: userCoachHans.id,
            location: 'National Sports Center Magglingen, Hall 3',
            date: new Date('2026-09-15T09:00:00Z'),
            durationHours: 6,
            validityExtensionMonths: 24,
        },
    });

    const refereeCourse = await prisma.refresherCourse.create({
        data: {
            associationId: sttfNational.id,
            title: 'Elite Umpire Level 2 Refresher Seminar',
            type: CourseType.REFEREE_REFRESHER,
            instructorId: userRefereeSandra.id,
            location: 'Haus des Sports, Ittigen / Zoom Hybrid',
            date: new Date('2026-10-05T18:30:00Z'),
            durationHours: 4,
            validityExtensionMonths: 12,
        },
    });

    await prisma.courseAttendance.createMany({
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

    // 6. TEAMS & CLUB ROSTERS
    console.log('  🛡️  Creating Teams & Rosters...');
    const teamZurichElite = await prisma.team.create({
        data: {
            name: 'TTC Zürich 1 (NLA)',
            clubId: clubZurich.id,
        },
    });

    const teamBernElite = await prisma.team.create({
        data: {
            name: 'TTC Bern Capitals 1 (NLA)',
            clubId: clubBern.id,
        },
    });

    const teamGenevaElite = await prisma.team.create({
        data: {
            name: 'CTT Genève 1 (NLA)',
            clubId: clubGeneva.id,
        },
    });

    const teamBaselElite = await prisma.team.create({
        data: {
            name: 'TTC Basel 1 (NLA)',
            clubId: clubBasel.id,
        },
    });

    await prisma.teamMember.createMany({
        data: [
            { teamId: teamZurichElite.id, userId: userPlayerMarco.id, role: 'CAPTAIN' },
            { teamId: teamBernElite.id, userId: userPlayerDavid.id, role: 'CAPTAIN' },
            { teamId: teamGenevaElite.id, userId: userPlayerElena.id, role: 'CAPTAIN' },
            { teamId: teamBaselElite.id, userId: userPlayerLucas.id, role: 'CAPTAIN' },
        ],
    });

    // 7. TOURNAMENTS & MATCHES
    console.log('  🏆 Creating Tournaments, Categories, Fixtures & Match Results...');
    const swissChampionship = await prisma.competition.create({
        data: {
            name: 'Swiss National Table Tennis Championship 2026',
            type: CompetitionType.TOURNAMENT,
            description: 'The premier national championship tournament bringing together the top licensed athletes.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2026-06-12T08:00:00Z'),
            endDate: new Date('2026-06-14T19:00:00Z'),
            location: 'Saalsporthalle, Zürich',
            status: CompetitionStatus.IN_PROGRESS,
        },
    });

    const menEliteCategory = await prisma.category.create({
        data: {
            competitionId: swissChampionship.id,
            name: "Men's Elite Singles (A-Series)",
            nameI18n: {
                en: "Men's Elite Singles (A-Series)",
                de: 'Herren Elite Einzel (A-Serie)',
                fr: 'Simple Messieurs Elite (Série A)',
                it: 'Singolare Maschile Elite (Serie A)',
            },
            teamSize: 1,
            minElo: 1500,
            genderRestriction: GenderRestriction.MALE_ONLY,
            roundsPerGroup: 1,
        },
    });

    const groupA = await prisma.competitionGroup.create({
        data: {
            categoryId: menEliteCategory.id,
            name: 'Quarter-Finals Group A',
        },
    });

    await prisma.teamCategoryRegistration.createMany({
        data: [
            { categoryId: menEliteCategory.id, teamId: teamZurichElite.id },
            { categoryId: menEliteCategory.id, teamId: teamBernElite.id },
        ],
    });

    const encounterFinal = await prisma.encounter.create({
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
            status: EncounterStatus.FINISHED,
        },
    });

    await prisma.match.create({
        data: {
            encounterId: encounterFinal.id,
            orderIndex: 1,
            matchType: MatchType.SINGLE,
            label: 'Men Singles #1: Marco Bernasconi vs David Schneider',
            homePlayer1Id: userPlayerMarco.id,
            awayPlayer1Id: userPlayerDavid.id,
            homeWonSets: 3,
            awayWonSets: 1,
            winner: MatchWinner.HOME,
            status: EncounterStatus.FINISHED,
            sets: [
                { setNumber: 1, homeScore: 11, awayScore: 8 },
                { setNumber: 2, homeScore: 9, awayScore: 11 },
                { setNumber: 3, homeScore: 11, awayScore: 7 },
                { setNumber: 4, homeScore: 11, awayScore: 9 },
            ],
        },
    });

    await prisma.competition.create({
        data: {
            name: 'Swiss National League A (NLA) 2025/2026',
            type: CompetitionType.LEAGUE,
            description: 'Official Swiss National League A championship season.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2025-09-01T00:00:00Z'),
            endDate: new Date('2026-05-30T00:00:00Z'),
            status: CompetitionStatus.IN_PROGRESS,
        },
    });

    // 8. BILLING & INVOICES
    console.log('  💳 Creating Invoices & Line Items...');
    const invoiceMembership = await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-2026-001',
            associationId: sttfNational.id,
            targetType: InvoiceTargetType.MEMBER_CLUB,
            recipientClubId: clubZurich.id,
            recipientName: 'TTC Zürich-Affoltern',
            recipientEmail: 'info@ttc-zurich.ch',
            recipientAddress: 'Fronwaldstrasse 115, 8046 Zürich',
            status: InvoiceStatus.PAID,
            category: InvoiceCategory.MEMBERSHIP_FEE,
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

    await prisma.invoiceLineItem.create({
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

    const invoiceEntry = await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-2026-002',
            associationId: sttfNational.id,
            targetType: InvoiceTargetType.MEMBER_CLUB,
            recipientClubId: clubBern.id,
            recipientName: 'TTC Bern Capitals',
            recipientEmail: 'contact@ttc-bern.ch',
            recipientAddress: 'Brunnmattstrasse 20, 3007 Bern',
            status: InvoiceStatus.SENT,
            category: InvoiceCategory.COMPETITION_ENTRY,
            currency: 'CHF',
            subtotal: 240.0,
            taxRate: 0.0,
            taxAmount: 0.0,
            totalAmount: 240.0,
            dueDate: new Date(Date.now() + 86400000 * 14),
            notes: 'Swiss National Championship 2026 Team Registration Entry Fees.',
        },
    });

    await prisma.invoiceLineItem.create({
        data: {
            invoiceId: invoiceEntry.id,
            position: 1,
            description: 'Team Entry: Swiss National Championship 2026',
            quantity: 2,
            unitPrice: 120.0,
            totalPrice: 240.0,
        },
    });

    // 9. ADMIN NOTICES
    console.log('  📢 Publishing System Announcements & Admin Notices...');
    await prisma.adminNotice.create({
        data: {
            title: 'Welcome to the AREENA Sports Federation Platform Demo',
            content:
                'Explore the multi-tier Swiss federation ecosystem: inspect tournament encounters, review license approvals, manage club rosters, and test role-based access.',
            titleI18n: {
                en: 'Welcome to the AREENA Sports Federation Platform Demo',
                de: 'Willkommen bei der AREENA Sportverbands-Plattform Demo',
                fr: 'Bienvenue sur la démo de la plateforme AREENA',
                it: 'Benvenuti nella demo della piattaforma federale AREENA',
            },
            contentI18n: {
                en: 'Explore the multi-tier Swiss federation ecosystem: inspect tournament encounters, review license approvals, manage club rosters, and test role-based access.',
                de: 'Entdecken Sie das Schweizer Verbandsökosystem: Turnierbegegnungen einsehen, Lizenzanträge prüfen, Kader verwalten und Rollenberechtigungen testen.',
                fr: 'Explorez l’écosystème fédéral suisse : suivez les rencontres de tournoi, validez les licences, gérez les effectifs de club et testez les accès.',
                it: 'Esplora l’ecosistema federale svizzero: visualizza gli incontri, approva i tesseramenti, gestisci i roster dei club e verifica i ruoli.',
            },
            type: NoticeType.INFO,
            displayMode: NoticeDisplayMode.BANNER,
            targetGroup: NoticeTargetGroup.ALL,
            isDismissible: true,
            createdById: userSuperAdmin.id,
            priority: 10,
        },
    });

    await prisma.adminNotice.create({
        data: {
            title: '2026 Swiss National Cup Registrations Closing',
            content:
                'Attention all licensed athletes and club managers: Final team entries and player license renewals must be confirmed by this Friday at 23:59 CET.',
            titleI18n: {
                en: '2026 Swiss National Cup Registrations Closing',
                de: 'Anmeldeschluss für den Schweizer Cup 2026',
                fr: 'Clôture des inscriptions à la Coupe Suisse 2026',
                it: 'Chiusura iscrizioni alla Coppa Svizzera 2026',
            },
            contentI18n: {
                en: 'Attention all licensed athletes and club managers: Final team entries and player license renewals must be confirmed by this Friday at 23:59 CET.',
                de: 'Achtung an alle lizenzierten Athleten und Vereinsmanager: Mannschaftsmeldungen und Lizenzerneuerungen müssen bis Freitag um 23:59 Uhr bestätigt sein.',
                fr: 'Attention aux athlètes licenciés et responsables de club : Les inscriptions d’équipes et renouvellements de licences doivent être confirmés avant vendredi 23h59 CET.',
                it: 'Attenzione a tutti gli atleti tesserati e dirigenti di club: le iscrizioni delle squadre e i rinnovi devono essere confermati entro venerdì alle 23:59 CET.',
            },
            type: NoticeType.WARNING,
            displayMode: NoticeDisplayMode.MODAL,
            targetGroup: NoticeTargetGroup.PLAYERS,
            isDismissible: true,
            createdById: userSttfPresident.id,
            priority: 5,
        },
    });

    // 10. CALENDAR & AUDIT
    console.log('  📅 Creating Calendar Events & Governance Audit Logs...');
    await prisma.calendarEvent.createMany({
        data: [
            {
                title: 'Swiss National Championship 2026 Kickoff',
                description: 'Opening round and group stages at Saalsporthalle Zürich.',
                eventType: EventType.TOURNAMENT,
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
                eventType: EventType.REFRESHER_COURSE,
                associationId: sttfNational.id,
                startDate: new Date('2026-09-15T09:00:00Z'),
                endDate: new Date('2026-09-15T15:00:00Z'),
                location: 'National Sports Center Magglingen',
                isPublic: true,
            },
        ],
    });

    await prisma.auditLog.createMany({
        data: [
            {
                userId: userSuperAdmin.id,
                userEmail: userSuperAdmin.email,
                userName: 'Super Administrator',
                action: 'SYSTEM_BOOTSTRAP_INITIALIZE',
                category: AuditCategory.GOVERNANCE,
                description: 'Initialized Swiss Table Tennis Federation (STTF) primary organization and demo seeds.',
                status: 'SUCCESS',
            },
            {
                userId: userSttfPresident.id,
                userEmail: userSttfPresident.email,
                userName: 'Beat Hirschi',
                action: 'LICENSE_BATCH_APPROVE',
                category: AuditCategory.LICENSING,
                description: 'Approved seasonal licenses for TTC Zürich, TTC Bern, TTC Geneva, and TTC Basel.',
                status: 'SUCCESS',
            },
        ],
    });

    console.log('\n✨ AREENA Demo Database Seeding Completed Successfully!\n');
}
