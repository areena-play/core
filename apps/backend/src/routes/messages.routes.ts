import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createBroadcastSchema, AuditCategory } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BroadcastService } from '../services/broadcastService';
import { AuditService } from '../services/auditService';

const router = Router();

// POST /messages/broadcast - Send broadcast communication
router.post(
    '/broadcast',
    authenticateToken,
    validate(createBroadcastSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { subject, body, channel, associationId, clubId, targetRole } = req.body;

            // Verify permission: Club admin (if clubId) or Association admin (if associationId) or Super admin
            let allowed = req.user!.isSuperAdmin;
            if (!allowed && clubId) {
                allowed = req.user!.clubRoles.some((r) => r.clubId === clubId);
            }
            if (!allowed && associationId) {
                allowed = req.user!.associationRoles.some((r) => r.associationId === associationId);
            }

            if (!allowed) {
                return res.status(403).json({ error: 'Permission denied to broadcast messages for this organization' });
            }

            const result = await BroadcastService.sendBroadcast({
                senderUserId: req.user!.id,
                associationId,
                clubId,
                subject,
                body,
                channel,
                targetRole,
            });

            // Trace communication action in immutable audit log
            await AuditService.record({
                req,
                action: 'COMMUNICATION_BROADCAST',
                category: AuditCategory.COMMUNICATION,
                entityType: 'BroadcastMessage',
                entityId: result.message.id,
                associationId,
                clubId,
                description: `Broadcast ${channel.toLowerCase()} message "${subject}" dispatched to ${result.recipientCount} recipient(s)`,
                status: 'SUCCESS',
                metadata: {
                    subject,
                    recipientCount: result.recipientCount,
                    channel,
                    targetRole: targetRole || 'ALL',
                    bodySnippet: body.slice(0, 100),
                },
            });

            res.status(201).json(result);
        } catch (err: any) {
            await AuditService.record({
                req,
                action: 'COMMUNICATION_BROADCAST',
                category: AuditCategory.COMMUNICATION,
                entityType: 'BroadcastMessage',
                associationId: req.body?.associationId,
                clubId: req.body?.clubId,
                description: `Failed to dispatch broadcast message "${req.body?.subject || ''}": ${err.message}`,
                status: 'FAILURE',
                metadata: { error: err.message },
            });
            res.status(400).json({ error: err.message });
        }
    },
);

// GET /messages - List sent broadcast communications
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const messages = await prisma.broadcastMessage.findMany({
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, email: true } },
                association: { select: { id: true, name: true } },
                club: { select: { id: true, name: true } },
                _count: { select: { recipients: true } },
            },
            orderBy: { sentAt: 'desc' },
            take: 50,
        });

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

export default router;
