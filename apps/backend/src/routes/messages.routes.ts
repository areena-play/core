import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createBroadcastSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BroadcastService } from '../services/broadcastService';

const router = Router();

// POST /messages/broadcast - Send broadcast communication
router.post('/broadcast', authenticateToken, validate(createBroadcastSchema), async (req: AuthRequest, res: Response, next) => {
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

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

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

