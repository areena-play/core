"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = void 0;
const prisma_1 = require("../config/prisma");
const shared_1 = require("@areena/shared");
const redis_1 = require("../config/redis");
class BroadcastService {
    /**
     * Sends or queues a broadcast email or SMS message to members with targeted audience filters.
     */
    static async sendBroadcast(data) {
        const channel = data.channel || shared_1.MessageChannel.EMAIL;
        // Find recipient users matching target criteria
        let recipientUsers = [];
        if (data.clubId) {
            // Find all users in club
            const members = await prisma_1.prisma.user.findMany({
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
        }
        else if (data.associationId) {
            const members = await prisma_1.prisma.user.findMany({
                where: {
                    OR: [
                        { associationRoles: { some: { associationId: data.associationId } } },
                        { licenses: { some: { associationId: data.associationId, status: 'APPROVED' } } },
                    ],
                },
                select: { id: true, email: true, phone: true },
            });
            recipientUsers = members;
        }
        else {
            // All users (Top-level broadcast)
            recipientUsers = await prisma_1.prisma.user.findMany({
                select: { id: true, email: true, phone: true },
            });
        }
        // Filter by role if specified
        if (data.targetRole && data.targetRole !== 'ALL') {
            if (data.targetRole === 'COACH') {
                const coachUserIds = (await prisma_1.prisma.license.findMany({
                    where: { type: 'COACH', status: 'APPROVED' },
                    select: { userId: true },
                })).map((l) => l.userId);
                recipientUsers = recipientUsers.filter((u) => coachUserIds.includes(u.id));
            }
            else if (data.targetRole === 'REFEREE') {
                const refUserIds = (await prisma_1.prisma.license.findMany({
                    where: { type: 'REFEREE', status: 'APPROVED' },
                    select: { userId: true },
                })).map((l) => l.userId);
                recipientUsers = recipientUsers.filter((u) => refUserIds.includes(u.id));
            }
            else if (data.targetRole === 'PLAYER') {
                const playerUserIds = (await prisma_1.prisma.license.findMany({
                    where: { type: { in: ['PLAYER_REGULAR', 'PLAYER_TCARD', 'PLAYER_WOMEN', 'PLAYER_JUNIOR', 'PLAYER_SENIOR'] }, status: 'APPROVED' },
                    select: { userId: true },
                })).map((l) => l.userId);
                recipientUsers = recipientUsers.filter((u) => playerUserIds.includes(u.id));
            }
        }
        // Create broadcast message entry
        const message = await prisma_1.prisma.broadcastMessage.create({
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
            await prisma_1.prisma.messageRecipient.createMany({
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
            await redis_1.redisPub.publish('areena:announcements', JSON.stringify({
                event: 'BROADCAST_SENT',
                messageId: message.id,
                subject: message.subject,
                channel: message.channel,
                recipientCount: recipientUsers.length,
                sentAt: message.sentAt,
            }));
        }
        catch { }
        return {
            message,
            recipientCount: recipientUsers.length,
        };
    }
}
exports.BroadcastService = BroadcastService;
