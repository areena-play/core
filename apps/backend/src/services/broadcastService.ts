import { prisma } from '../config/prisma';
import { MessageChannel } from '@areena/shared';
import { redisPub } from '../config/redis';

export class BroadcastService {
  /**
   * Sends or queues a broadcast email or SMS message to members with targeted audience filters.
   */
  static async sendBroadcast(data: {
    senderUserId: string;
    associationId?: string | null;
    clubId?: string | null;
    subject: string;
    body: string;
    channel?: MessageChannel;
    targetRole?: string | null;
  }) {
    const channel = data.channel || MessageChannel.EMAIL;

    // Find recipient users matching target criteria
    let recipientUsers: Array<{ id: string; email: string; phone: string }> = [];

    if (data.clubId) {
      // Find all users in club
      const members = await prisma.user.findMany({
        where: {
          OR: [
            { clubRoles: { some: { clubId: data.clubId } } },
            { licenses: { some: { clubId: data.clubId, status: 'APPROVED' } } },
            { teamMemberships: { some: { team: { clubId: data.clubId } } } },
          ],
        },
        select: { id: true, email: true, phone: true },
      });
      recipientUsers = members;
    } else if (data.associationId) {
      const members = await prisma.user.findMany({
        where: {
          OR: [
            { associationRoles: { some: { associationId: data.associationId } } },
            { licenses: { some: { associationId: data.associationId, status: 'APPROVED' } } },
          ],
        },
        select: { id: true, email: true, phone: true },
      });
      recipientUsers = members;
    } else {
      // All users (Top-level broadcast)
      recipientUsers = await prisma.user.findMany({
        select: { id: true, email: true, phone: true },
      });
    }

    // Filter by role if specified
    if (data.targetRole && data.targetRole !== 'ALL') {
      if (data.targetRole === 'COACH') {
        const coachUserIds = (
          await prisma.license.findMany({
            where: { type: 'COACH', status: 'APPROVED' },
            select: { userId: true },
          })
        ).map((l) => l.userId);
        recipientUsers = recipientUsers.filter((u) => coachUserIds.includes(u.id));
      } else if (data.targetRole === 'REFEREE') {
        const refUserIds = (
          await prisma.license.findMany({
            where: { type: 'REFEREE', status: 'APPROVED' },
            select: { userId: true },
          })
        ).map((l) => l.userId);
        recipientUsers = recipientUsers.filter((u) => refUserIds.includes(u.id));
      } else if (data.targetRole === 'PLAYER') {
        const playerUserIds = (
          await prisma.license.findMany({
            where: { type: { in: ['PLAYER_REGULAR', 'PLAYER_TCARD', 'PLAYER_WOMEN', 'PLAYER_JUNIOR', 'PLAYER_SENIOR'] }, status: 'APPROVED' },
            select: { userId: true },
          })
        ).map((l) => l.userId);
        recipientUsers = recipientUsers.filter((u) => playerUserIds.includes(u.id));
      }
    }

    // Create broadcast message entry
    const message = await prisma.broadcastMessage.create({
      data: {
        senderUserId: data.senderUserId,
        associationId: data.associationId,
        clubId: data.clubId,
        subject: data.subject,
        body: data.body,
        channel,
        targetFilter: { targetRole: data.targetRole || 'ALL' },
      },
    });

    // Create recipient records
    if (recipientUsers.length > 0) {
      await prisma.messageRecipient.createMany({
        data: recipientUsers.map((u) => ({
          messageId: message.id,
          recipientUserId: u.id,
          status: 'DELIVERED',
        })),
        skipDuplicates: true,
      });
    }

    // Broadcast event over Redis
    try {
      await redisPub.publish(
        'areena:announcements',
        JSON.stringify({
          event: 'BROADCAST_SENT',
          messageId: message.id,
          subject: message.subject,
          channel: message.channel,
          recipientCount: recipientUsers.length,
          sentAt: message.sentAt,
        })
      );
    } catch {}

    return {
      message,
      recipientCount: recipientUsers.length,
    };
  }
}

