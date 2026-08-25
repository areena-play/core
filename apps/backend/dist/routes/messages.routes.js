"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const broadcastService_1 = require("../services/broadcastService");
const router = (0, express_1.Router)();
// POST /messages/broadcast - Send broadcast communication
router.post('/broadcast', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.createBroadcastSchema), async (req, res, next) => {
    try {
        const { subject, body, channel, associationId, clubId, targetRole } = req.body;
        // Verify permission: Club admin (if clubId) or Association admin (if associationId) or Super admin
        let allowed = req.user.isSuperAdmin;
        if (!allowed && clubId) {
            allowed = req.user.clubRoles.some((r) => r.clubId === clubId);
        }
        if (!allowed && associationId) {
            allowed = req.user.associationRoles.some((r) => r.associationId === associationId);
        }
        if (!allowed) {
            return res.status(403).json({ error: 'Permission denied to broadcast messages for this organization' });
        }
        const result = await broadcastService_1.BroadcastService.sendBroadcast({
            senderUserId: req.user.id,
            associationId,
            clubId,
            subject,
            body,
            channel,
            targetRole,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// GET /messages - List sent broadcast communications
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const messages = await prisma_1.prisma.broadcastMessage.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
