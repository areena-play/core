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
    await prisma.supportInquiry.deleteMany();
    await prisma.faqItem.deleteMany();
    await prisma.supportSubject.deleteMany();
    await prisma.locationUnitReservation.deleteMany();
    await prisma.locationUnit.deleteMany();
    await prisma.locationClub.deleteMany();
    await prisma.locationAssociation.deleteMany();
    await prisma.competitionLocation.deleteMany();
    await prisma.location.deleteMany();
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
    await prisma.competitionSpeakerCallout.deleteMany();
    await prisma.competitionUserRole.deleteMany();
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
            slug: 'sttf',
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
            slug: 'ottv',
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
            slug: 'artt',
            level: AssociationLevel.REGIONAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 3,
        },
    });

    const sttfZurich = await prisma.association.create({
        data: {
            name: 'Tischtennisverband Zürich (TTVZ)',
            shortName: 'TTVZ',
            code: 'TTVZ',
            slug: 'ttvz',
            level: AssociationLevel.LOCAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 4,
        },
    });

    const sttfStGallen = await prisma.association.create({
        data: {
            name: 'Tischtennisverband St. Gallen (TTSG)',
            shortName: 'TTSG',
            code: 'TTSG',
            slug: 'ttsg',
            level: AssociationLevel.LOCAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 5,
        },
    });

    const sttfVaud = await prisma.association.create({
        data: {
            name: 'Association Vaudoise de Tennis de Table (AVTT)',
            shortName: 'AVTT',
            code: 'AVTT',
            slug: 'avtt',
            level: AssociationLevel.LOCAL,
            isTopLevel: false,
            licenseIdTemplate: '{regionDigit}{year2}{counter3}',
            regionDigit: 6,
        },
    });

    await prisma.associationHierarchy.createMany({
        data: [
            // National -> Regionals
            { parentId: sttfNational.id, childId: sttfOst.id },
            { parentId: sttfNational.id, childId: sttfRomandie.id },
            // Regional OTTV -> Local Sub-Associations
            { parentId: sttfOst.id, childId: sttfZurich.id },
            { parentId: sttfOst.id, childId: sttfStGallen.id },
            // Regional ARTT -> Local Sub-Association
            { parentId: sttfRomandie.id, childId: sttfVaud.id },
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

    const clubZurich = await prisma.club.create({
        data: {
            name: 'Tischtennisclub Zürich-Affoltern',
            code: 'TTC-ZH',
            slug: 'ttc-zurich',
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
            slug: 'ttc-bern',
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
            slug: 'ctt-geneve',
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
            slug: 'ttc-basel',
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
            slug: 'swiss-championship-2026',
            seriesSlug: 'swiss-championship',
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

    const swissChampionship2025 = await prisma.competition.create({
        data: {
            name: 'Swiss National Table Tennis Championship 2025',
            type: CompetitionType.TOURNAMENT,
            slug: 'swiss-championship-2025',
            seriesSlug: 'swiss-championship',
            description: 'Previous year edition of the Swiss National Table Tennis Championship.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2025-06-13T08:00:00Z'),
            endDate: new Date('2025-06-15T19:00:00Z'),
            location: 'St. Jakobshalle, Basel',
            status: CompetitionStatus.COMPLETED,
        },
    });

    const nationalLeagueA = await prisma.competition.create({
        data: {
            name: 'National League A (NLA) 2025/2026',
            type: CompetitionType.LEAGUE,
            slug: 'national-league-a-2025-26',
            seriesSlug: 'national-league-a',
            description: 'Swiss top division team championship league with round-robin encounters.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2025-09-01T09:00:00Z'),
            endDate: new Date('2026-05-30T18:00:00Z'),
            location: 'Multiple Club Arenas',
            status: CompetitionStatus.IN_PROGRESS,
        },
    });

    const swissCup = await prisma.competition.create({
        data: {
            name: 'Swiss National Cup 2025/2026',
            type: CompetitionType.SEASON_TOURNAMENT,
            slug: 'swiss-cup-2025-26',
            seriesSlug: 'swiss-cup',
            description: 'Full-season knockout cup competition spanning across national and regional associations.',
            associationId: sttfNational.id,
            seasonId: currentSeason.id,
            startDate: new Date('2025-10-01T08:00:00Z'),
            endDate: new Date('2026-06-20T20:00:00Z'),
            location: 'National Cup Finals, Bern',
            status: CompetitionStatus.IN_PROGRESS,
        },
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
                userEmail: userSuperAdmin.email || '',
                userName: 'Super Administrator',
                action: 'SYSTEM_BOOTSTRAP_INITIALIZE',
                category: AuditCategory.GOVERNANCE,
                description: 'Initialized Swiss Table Tennis Federation (STTF) primary organization and demo seeds.',
                status: 'SUCCESS',
            },
            {
                userId: userSttfPresident.id,
                userEmail: userSttfPresident.email || '',
                userName: 'Beat Hirschi',
                action: 'LICENSE_BATCH_APPROVE',
                category: AuditCategory.LICENSING,
                description: 'Approved seasonal licenses for TTC Zürich, TTC Bern, TTC Geneva, and TTC Basel.',
                status: 'SUCCESS',
            },
        ],
    });

    
    // 10. SUPPORT SUBJECTS & FAQS
    console.log('  💬 Seeding Support Subjects & Multilingual FAQs...');

    // System Support Subjects
    const subBug = await prisma.supportSubject.create({
        data: {
            title: 'Platform Bug / Technical Glitch',
            titleI18n: {
                en: 'Platform Bug / Technical Glitch',
                de: 'Plattform-Fehler / Technisches Problem',
                fr: 'Bug de la plateforme / Problème technique',
                it: 'Bug della piattaforma / Problema tecnico',
            },
            description: 'Report software bugs, display glitches, or unexpected system errors.',
            descriptionI18n: {
                en: 'Report software bugs, display glitches, or unexpected system errors.',
                de: 'Melden Sie Softwarefehler, Anzeigefehler oder unerwartete Systemfehler.',
                fr: 'Signalez des bugs logiciels, des erreurs d\'affichage ou des erreurs système inattendues.',
                it: 'Segnala bug software, errori di visualizzazione o errori imprevisti di sistema.',
            },
            targetType: 'SYSTEM',
            isSystem: true,
            order: 1,
            isActive: true,
        },
    });

    const subAccount = await prisma.supportSubject.create({
        data: {
            title: 'Account Access & Login Assistance',
            titleI18n: {
                en: 'Account Access & Login Assistance',
                de: 'Kontozugriff & Anmeldeunterstützung',
                fr: 'Accès au compte & Assistance à la connexion',
                it: 'Accesso all\'account & Assistenza al login',
            },
            description: 'Assistance with 2FA, password resets, or email verification.',
            targetType: 'SYSTEM',
            isSystem: true,
            order: 2,
            isActive: true,
        },
    });

    const subBilling = await prisma.supportSubject.create({
        data: {
            title: 'Billing & Platform Subscription',
            titleI18n: {
                en: 'Billing & Platform Subscription',
                de: 'Abrechnung & Plattform-Abonnement',
                fr: 'Facturation & Abonnement à la plateforme',
                it: 'Fatturazione & Abbonamento alla piattaforma',
            },
            description: 'Inquiries regarding federation billing, Bexio sync, or license fees.',
            targetType: 'SYSTEM',
            isSystem: true,
            order: 3,
            isActive: true,
        },
    });

    // Association Support Subjects (STTF)
    const subLicenseTransfer = await prisma.supportSubject.create({
        data: {
            title: 'Player License Transfer & Approvals',
            titleI18n: {
                en: 'Player License Transfer & Approvals',
                de: 'Spielerlizenz-Transfer & Genehmigungen',
                fr: 'Transfert de licence de joueur & Approbations',
                it: 'Trasferimento licenza giocatore & Approvazioni',
            },
            description: 'Official federation requests for inter-club player transfers and national license approvals.',
            targetType: 'ASSOCIATION',
            associationId: sttfNational.id,
            isSystem: false,
            order: 1,
            isActive: true,
        },
    });

    const subTournamentSanction = await prisma.supportSubject.create({
        data: {
            title: 'Championship Sanctioning & Regulations',
            titleI18n: {
                en: 'Championship Sanctioning & Regulations',
                de: 'Meisterschafts-Sanktionierung & Reglement',
                fr: 'Homologation des championnats & Règlements',
                it: 'Omologazione campionati & Regolamenti',
            },
            description: 'Inquiries regarding national championship rules, sanctions, and referee assignments.',
            targetType: 'ASSOCIATION',
            associationId: sttfNational.id,
            isSystem: false,
            order: 2,
            isActive: true,
        },
    });

    // Club Support Subjects (TTC Zurich)
    const subClubMembership = await prisma.supportSubject.create({
        data: {
            title: 'Club Membership & Training Times',
            titleI18n: {
                en: 'Club Membership & Training Times',
                de: 'Club-Mitgliedschaft & Trainingszeiten',
                fr: 'Adhésion au club & Horaires d\'entraînement',
                it: 'Iscrizione al club & Orari degli allenamenti',
            },
            description: 'Inquiries regarding joining TTC Zürich, training sessions, and club fees.',
            targetType: 'CLUB',
            clubId: clubZurich.id,
            isSystem: false,
            order: 1,
            isActive: true,
        },
    });

    // System FAQs
    await prisma.faqItem.createMany({
        data: [
            {
                question: 'How do I activate or renew my seasonal license?',
                questionI18n: {
                    en: 'How do I activate or renew my seasonal license?',
                    de: 'Wie aktiviere oder erneuere ich meine Saisonlizenz?',
                    fr: 'Comment activer ou renouveler ma licence saisonnière ?',
                    it: 'Come attivo o rinnovo la mia licenza stagionale?',
                },
                answer: 'Navigate to the Licenses menu in your dashboard and click "Apply for License". Select your sport category (Player, Coach, or Referee) and submit the form. Your club administrator or federation office will review and approve the application.',
                answerI18n: {
                    en: 'Navigate to the Licenses menu in your dashboard and click "Apply for License". Select your sport category (Player, Coach, or Referee) and submit the form. Your club administrator or federation office will review and approve the application.',
                    de: 'Navigieren Sie im Dashboard zum Menü "Lizenzen" und klicken Sie auf "Lizenz beantragen". Wählen Sie Ihre Sportkategorie (Spieler, Trainer oder Schiedsrichter) und senden Sie das Formular ab. Ihr Club-Administrator oder die Verbandsgeschäftsstelle prüft und genehmigt den Antrag.',
                    fr: 'Accédez au menu Licences de votre tableau de bord et cliquez sur "Demander une licence". Sélectionnez votre catégorie (Joueur, Entraîneur ou Arbitre) et soumettez le formulaire. Votre administrateur de club ou le secrétariat fédéral examinera et approuvera la demande.',
                    it: 'Vai al menu Licenze nella tua dashboard e fai clic su "Richiedi licenza". Seleziona la tua categoria sportiva (Giocatore, Allenatore o Arbitro) e invia il modulo. L\'amministratore del tuo club o la segreteria federale esaminerà e approverà la richiesta.',
                },
                category: 'LICENSES',
                categoryI18n: {
                    en: 'Licenses',
                    de: 'Lizenzen',
                    fr: 'Licences',
                    it: 'Licenze',
                },
                order: 1,
                isPublished: true,
                createdById: userSuperAdmin.id,
            },
            {
                question: 'How are ELO ratings and rankings calculated?',
                questionI18n: {
                    en: 'How are ELO ratings and rankings calculated?',
                    de: 'Wie werden die ELO-Wertungen und Ranglisten berechnet?',
                    fr: 'Comment les classements et points ELO sont-ils calculés ?',
                    it: 'Come vengono calcolati i punteggi e le classifiche ELO?',
                },
                answer: 'AREENA uses the official Swiss Table Tennis dynamic ELO formula (K=32 factor). When a match is completed and verified, points are automatically adjusted based on the relative rating difference between opponents in real-time.',
                answerI18n: {
                    en: 'AREENA uses the official Swiss Table Tennis dynamic ELO formula (K=32 factor). When a match is completed and verified, points are automatically adjusted based on the relative rating difference between opponents in real-time.',
                    de: 'AREENA verwendet die offizielle dynamische ELO-Formel von Swiss Table Tennis (K=32 Faktor). Nach Abschluss und Bestätigung einer Begegnung werden die Punkte automatisch basierend auf dem relativen Wertungsunterschied in Echtzeit angepasst.',
                    fr: 'AREENA utilise la formule ELO dynamique officielle de Swiss Table Tennis (facteur K=32). Lorsqu\'un match est terminé et validé, les points sont automatiquement ajustés en temps réel en fonction de la différence de classement relative entre les adversaires.',
                    it: 'AREENA utilizza la formula ELO dinamica ufficiale di Swiss Table Tennis (fattore K=32). Quando una partita viene completata e verificata, i punti vengono aggiornati automaticamente in tempo reale.',
                },
                category: 'TOURNAMENTS',
                categoryI18n: {
                    en: 'Tournaments',
                    de: 'Turniere',
                    fr: 'Tournois',
                    it: 'Tornei',
                },
                order: 2,
                isPublished: true,
                createdById: userSuperAdmin.id,
            },
            {
                question: 'How do umpires submit live match scores?',
                questionI18n: {
                    en: 'How do umpires submit live match scores?',
                    de: 'Wie erfassen Schiedsrichter Live-Spielstände?',
                    fr: 'Comment les arbitres saisissent-ils les scores en direct ?',
                    it: 'Come registrano gli arbitri i punteggi delle partite dal vivo?',
                },
                answer: 'Open the respective tournament encounter page. Umpires and authorized club captains will see a red "Enter Score" button next to each fixture. Set points can be entered set-by-set and broadcasted live via WebSocket to the live ticker.',
                answerI18n: {
                    en: 'Open the respective tournament encounter page. Umpires and authorized club captains will see a red "Enter Score" button next to each fixture. Set points can be entered set-by-set and broadcasted live via WebSocket to the live ticker.',
                    de: 'Öffnen Sie die entsprechende Turnier-Begegnungsseite. Schiedsrichter und autorisierte Mannschaftsführer sehen neben jeder Paarung einen roten Button "Resultat erfassen". Satzstände können satzweise eingegeben und per WebSocket live übertragen werden.',
                    fr: 'Ouvrez la page de la rencontre du tournoi. Les arbitres et capitaines autorisés verront un bouton rouge "Saisir le score". Les scores de sets peuvent être saisis set par set et diffusés en direct via WebSocket.',
                    it: 'Apri la pagina dell\'incontro del torneo. Gli arbitri e i capitani autorizzati vedranno un pulsante rosso "Inserisci punteggio". I punteggi dei set possono essere inseriti set per set e trasmessi dal vivo via WebSocket.',
                },
                category: 'TOURNAMENTS',
                categoryI18n: {
                    en: 'Tournaments',
                    de: 'Turniere',
                    fr: 'Tournois',
                    it: 'Tornei',
                },
                order: 3,
                isPublished: true,
                createdById: userSuperAdmin.id,
            },
            {
                question: 'What should I do if I forgot my account password?',
                questionI18n: {
                    en: 'What should I do if I forgot my account password?',
                    de: 'Was tun, wenn ich mein Passwort vergessen habe?',
                    fr: 'Que faire si j\'ai oublié mon mot de passe ?',
                    it: 'Cosa devo fare se ho dimenticato la password del mio account?',
                },
                answer: 'On the login page, click "Forgot Password". Enter your registered email address and you will receive a secure password reset link valid for 60 minutes.',
                answerI18n: {
                    en: 'On the login page, click "Forgot Password". Enter your registered email address and you will receive a secure password reset link valid for 60 minutes.',
                    de: 'Klicken Sie auf der Anmeldeseite auf "Passwort vergessen". Geben Sie Ihre registrierte E-Mail-Adresse ein, um einen sicheren Link zum Zurücksetzen des Passworts zu erhalten (60 Minuten gültig).',
                    fr: 'Sur la page de connexion, cliquez sur "Mot de passe oublié". Entrez votre adresse e-mail pour recevoir un lien de réinitialisation sécurisé valable 60 minutes.',
                    it: 'Nella pagina di accesso, fai clic su "Password dimenticata". Inserisci la tua email per ricevere un link sicuro per reimpostare la password valido per 60 minuti.',
                },
                category: 'ACCOUNT',
                categoryI18n: {
                    en: 'Account & Security',
                    de: 'Konto & Sicherheit',
                    fr: 'Compte & Sécurité',
                    it: 'Account & Sicurezza',
                },
                order: 4,
                isPublished: true,
                createdById: userSuperAdmin.id,
            },
        ],
    });

    // Association FAQs (STTF)
    await prisma.faqItem.create({
        data: {
            question: 'What are the eligibility requirements for the Swiss National Championship?',
            questionI18n: {
                en: 'What are the eligibility requirements for the Swiss National Championship?',
                de: 'Was sind die Teilnahmevoraussetzungen für die Schweizer Meisterschaft?',
                fr: 'Quelles sont les conditions d\'éligibilité pour les Championnats suisses ?',
                it: 'Quali sono i requisiti di idoneità per i Campionati Nazionali Svizzeri?',
            },
            answer: 'Athletes must hold an active A-Series national license approved by Swiss Table Tennis and meet the minimum regional tournament qualifying quota for the 2025/2026 season.',
            answerI18n: {
                en: 'Athletes must hold an active A-Series national license approved by Swiss Table Tennis and meet the minimum regional tournament qualifying quota for the 2025/2026 season.',
                de: 'Athleten müssen über eine von Swiss Table Tennis genehmigte aktive A-Serien-Nationallizenz verfügen und die regionale Mindestqualifikationsquote der Saison 2025/2026 erfüllen.',
                fr: 'Les athlètes doivent être titulaires d\'une licence nationale active de série A approuvée par Swiss Table Tennis et respecter le quota minimum de qualification régionale pour la saison 2025/2026.',
                it: 'Gli atleti devono essere in possesso di una licenza nazionale di serie A attiva approvata da Swiss Table Tennis e soddisfare la quota minima di qualificazione regionale.',
            },
            category: 'TOURNAMENTS',
            categoryI18n: {
                en: 'Tournaments',
                de: 'Turniere',
                fr: 'Tournois',
                it: 'Tornei',
            },
            associationId: sttfNational.id,
            order: 1,
            isPublished: true,
            createdById: userSttfPresident.id,
        },
    });

    // Club FAQs (TTC Zurich)
    await prisma.faqItem.create({
        data: {
            question: 'When and where are the competitive youth training sessions held at TTC Zürich?',
            questionI18n: {
                en: 'When and where are the competitive youth training sessions held at TTC Zürich?',
                de: 'Wann und wo finden die Jugend-Wettkampftrainings beim TTC Zürich statt?',
                fr: 'Quand et où ont lieu les entraînements de compétition pour les jeunes au TTC Zürich ?',
                it: 'Quando e dove si svolgono gli allenamenti agonistici giovanili al TTC Zürich?',
            },
            answer: 'Youth competitive sessions take place every Tuesday and Thursday from 17:30 to 19:30 at Turnhalle Utogrund, Zürich under the guidance of certified National Coaches.',
            answerI18n: {
                en: 'Youth competitive sessions take place every Tuesday and Thursday from 17:30 to 19:30 at Turnhalle Utogrund, Zürich under the guidance of certified National Coaches.',
                de: 'Die Jugend-Wettkampftrainings finden jeden Dienstag und Donnerstag von 17:30 bis 19:30 Uhr in der Turnhalle Utogrund in Zürich unter Leitung zertifizierter Nationaltrainer statt.',
                fr: 'Les séances pour les jeunes ont lieu tous les mardis et jeudis de 17h30 à 19h30 au gymnase Utogrund à Zurich avec des entraîneurs nationaux certifiés.',
                it: 'Gli allenamenti giovanili si svolgono ogni martedì e giovedì dalle 17:30 alle 19:30 presso la palestra Utogrund a Zurigo.',
            },
            category: 'GENERAL',
            categoryI18n: {
                en: 'Club Life',
                de: 'Club-Leben',
                fr: 'Vie du club',
                it: 'Vita del club',
            },
            clubId: clubZurich.id,
            order: 1,
            isPublished: true,
            createdById: userClubZurichAdmin.id,
        },
    });


    // 14. SPORTS LOCATIONS & PLAYING UNITS (COURTS / TABLES)
    console.log('  📍 Seeding Sports Arenas, Locations & Playing Units (Tables/Courts)...');

    // 1. Sporthalle Hardau (Zürich)
    const locZurich = await prisma.location.create({
        data: {
            name: 'Sporthalle Hardau Zürich',
            slug: 'sporthalle-hardau-zurich',
            address: 'Bullingerstrasse 60',
            city: 'Zürich',
            postalCode: '8004',
            country: 'Switzerland',
            description: 'Premier multi-sport arena in Zürich featuring 16 competition table tennis tables, Taraflex sports flooring, professional 1000 lux lighting, and spectator grandstand.',
            phone: '+41 44 413 90 00',
            email: 'hardau@sportamt-zurich.ch',
            website: 'https://sportamt.ch/hardau',
            googleMapsUrl: 'https://maps.google.com/?q=Bullingerstrasse+60+8004+Z%C3%BCrich',
            clubs: {
                create: [{ clubId: clubZurich.id, isPrimary: true }],
            },
            associations: {
                create: [
                    { associationId: sttfNational.id },
                    { associationId: sttfOst.id },
                ],
            },
        },
    });

    for (let i = 1; i <= 16; i++) {
        await prisma.locationUnit.create({
            data: {
                locationId: locZurich.id,
                name: `Table ${i}`,
                unitNumber: i,
                orderIndex: i,
                features: i <= 4 ? ['CENTER_COURT', 'PRO_LIGHTING', 'STREAMING_CAMERA', 'WHEELCHAIR_ACCESSIBLE'] : ['PRO_LIGHTING'],
                status: 'AVAILABLE',
            },
        });
    }

    // 2. STTF National Training Center Magglingen
    const locMagglingen = await prisma.location.create({
        data: {
            name: 'Nationales Sportzentrum Magglingen • STTF Arena',
            slug: 'sttf-arena-magglingen',
            address: 'Hauptstrasse 247',
            city: 'Magglingen',
            postalCode: '2532',
            country: 'Switzerland',
            description: 'National High-Performance Training Center and Elite Tournament Venue with 24 competition tables, video replay analysis, and physiotherapy facilities.',
            phone: '+41 58 467 61 11',
            email: 'performance@sttf.ch',
            website: 'https://sttf.ch/national-center',
            associations: {
                create: [{ associationId: sttfNational.id }],
            },
        },
    });

    for (let i = 1; i <= 24; i++) {
        await prisma.locationUnit.create({
            data: {
                locationId: locMagglingen.id,
                name: `Table ${i}`,
                unitNumber: i,
                orderIndex: i,
                features: ['PRO_LIGHTING', 'STREAMING_CAMERA', 'WHEELCHAIR_ACCESSIBLE'],
                status: 'AVAILABLE',
            },
        });
    }

    // 3. Centre Sportif du Bout-du-Monde (Genève)
    const locGeneve = await prisma.location.create({
        data: {
            name: 'Centre Sportif du Bout-du-Monde',
            slug: 'centre-sportif-bout-du-monde-geneve',
            address: 'Route de Vessy 12',
            city: 'Genève',
            postalCode: '1206',
            country: 'Switzerland',
            description: 'Major regional sports complex in Geneva hosting Western Switzerland regional championships and Swiss Cup fixtures.',
            phone: '+41 22 418 44 00',
            email: 'boutdumonde@ville-ge.ch',
            clubs: {
                create: [{ clubId: clubGeneva.id, isPrimary: true }],
            },
            associations: {
                create: [{ associationId: sttfRomandie.id }, { associationId: sttfNational.id }],
            },
        },
    });

    for (let i = 1; i <= 12; i++) {
        await prisma.locationUnit.create({
            data: {
                locationId: locGeneve.id,
                name: `Table ${i}`,
                unitNumber: i,
                orderIndex: i,
                features: ['PRO_LIGHTING'],
                status: 'AVAILABLE',
            },
        });
    }

    // 4. Sportcenter Rankhof (Basel)
    const locBasel = await prisma.location.create({
        data: {
            name: 'Sportcenter Rankhof Basel',
            slug: 'sportcenter-rankhof-basel',
            address: 'Grenzacherstrasse 405',
            city: 'Basel',
            postalCode: '4058',
            country: 'Switzerland',
            description: 'Home venue of TTC Basel with 10 tables and dedicated spectator area.',
            phone: '+41 61 690 99 00',
            email: 'info@rankhof-basel.ch',
            clubs: {
                create: [{ clubId: clubBasel.id, isPrimary: true }],
            },
            associations: {
                create: [{ associationId: sttfOst.id }],
            },
        },
    });

    for (let i = 1; i <= 10; i++) {
        await prisma.locationUnit.create({
            data: {
                locationId: locBasel.id,
                name: `Table ${i}`,
                unitNumber: i,
                orderIndex: i,
                features: ['PRO_LIGHTING'],
                status: 'AVAILABLE',
            },
        });
    }

    // Link Tournament Swiss Championship to Hardau Zurich and Magglingen
    const swissChamp = await prisma.competition.findFirst({ where: { slug: 'swiss-championship' } });
    if (swissChamp) {
        await prisma.competitionLocation.createMany({
            data: [
                { competitionId: swissChamp.id, locationId: locZurich.id },
                { competitionId: swissChamp.id, locationId: locMagglingen.id },
            ],
        });

        // Block Tables 1-8 at Hardau Zürich for Swiss Championship
        const hardauUnits = await prisma.locationUnit.findMany({
            where: { locationId: locZurich.id, unitNumber: { lte: 8 } },
        });

        const blockStart = new Date(Date.now() + 5 * 24 * 3600 * 1000);
        blockStart.setHours(9, 0, 0, 0);
        const blockEnd = new Date(Date.now() + 5 * 24 * 3600 * 1000);
        blockEnd.setHours(20, 0, 0, 0);

        for (const unit of hardauUnits) {
            await prisma.locationUnitReservation.create({
                data: {
                    unitId: unit.id,
                    type: 'COMPETITION_BLOCK',
                    status: 'CONFIRMED',
                    startTime: blockStart,
                    endTime: blockEnd,
                    title: 'Swiss Championship 2026 • Main Draw & Semi-Finals',
                    description: 'Reserved for Swiss National Championship 2026 encounters.',
                    competitionId: swissChamp.id,
                    reservedByUserId: userSttfPresident.id,
                },
            });
        }
    }

    console.log('\n✨ AREENA Demo Database Seeding Completed Successfully!\n');
}
