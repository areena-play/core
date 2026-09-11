import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AssociationLevel } from '@areena/shared';

async function resetToFreshAssociation() {
    console.log('🔄 Starting complete local database reset for a fresh start...');

    // 1. Delete all records in correct dependency order
    console.log('🧹 Clearing all tables...');
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
    await prisma.matchParticipant.deleteMany();
    await prisma.ratingSnapshotHistory.deleteMany();
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
    await prisma.userRelationship.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.associationHierarchy.deleteMany();
    await prisma.clubAssociation.deleteMany();
    await prisma.club.deleteMany();
    await prisma.association.deleteMany();
    await prisma.oAuthToken.deleteMany();
    await prisma.oAuthClient.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.user.deleteMany();

    console.log('✨ All existing records deleted.');

    // 2. Create the default Super Administrator account
    console.log('👤 Creating root Super Administrator user...');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@areena.ch',
            passwordHash,
            firstName: 'Super',
            lastName: 'Administrator',
            phone: '+41 79 100 00 01',
            street: 'Bundesplatz 3',
            postalCode: '3005',
            city: 'Bern',
            country: 'Switzerland',
            isSuperAdmin: true,
            emailVerified: true,
            accountStatus: 'ACTIVE',
            canLogin: true,
            displayNameChoice: 'FULL_NAME',
        },
    });

    // 3. Create clean Top-Level National Association
    console.log('🏛️  Creating fresh empty top-level Association...');
    const mainAssociation = await prisma.association.create({
        data: {
            name: 'Swiss Table Tennis Federation',
            shortName: 'STT',
            code: 'STT',
            slug: 'stt',
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

    // 4. Create active season
    console.log('📅 Creating initial season (2026/2027)...');
    await prisma.season.create({
        data: {
            associationId: mainAssociation.id,
            name: 'Season 2026/2027',
            startDate: new Date('2026-08-01T00:00:00Z'),
            endDate: new Date('2027-07-31T23:59:59Z'),
            isCurrent: true,
        },
    });

    // 5. Assign admin roles to Super Admin for the association
    await prisma.userAssociationRole.create({
        data: {
            userId: superAdmin.id,
            associationId: mainAssociation.id,
            role: 'ADMIN',
        },
    });

    await prisma.userAssociationRole.create({
        data: {
            userId: superAdmin.id,
            associationId: mainAssociation.id,
            role: 'PRESIDENT',
        },
    });

    console.log(`
=====================================================
🎉 Fresh Database Ready!
=====================================================
- Top-Level Association: "${mainAssociation.name}" (${mainAssociation.code})
- Associations: 1 (Clean, 0 sub-associations)
- Clubs: 0
- Members / Athletes: 0
- Licenses: 0
- Competitions: 0
-----------------------------------------------------
Super Admin Credentials:
- Email:    admin@areena.ch
- Password: Password123!
=====================================================
    `);
}

resetToFreshAssociation()
    .then(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ Failed to reset database:', err);
        await prisma.$disconnect();
        process.exit(1);
    });
