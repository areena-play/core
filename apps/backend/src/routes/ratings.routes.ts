import { Router, Request, Response } from 'express';
import { RatingService } from '../services/rating.service';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

export const ratingsRouter = Router();

/**
 * GET /api/ratings/user/:userId/history
 * Returns the complete chronological rating snapshot history for a user.
 */
ratingsRouter.get('/user/:userId/history', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const history = await RatingService.getUserRatingHistory(userId);
        res.json({ success: true, history });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/ratings/leaderboard
 * Filterable leaderboard by association, gender, category.
 */
ratingsRouter.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const { associationId, gender, limit = 50, offset = 0 } = req.query;

        const where: any = {
            hideEloRanking: false,
            isPubliclyHidden: false,
        };

        if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
            where.gender = gender;
        }

        if (associationId) {
            where.licenses = {
                some: {
                    associationId: String(associationId),
                    status: 'APPROVED',
                },
            };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    licenseId: true,
                    eloPoints: true,
                    currentLevel: true,
                    rank: true,
                    gender: true,
                    avatarUrl: true,
                    clubRoles: {
                        select: {
                            club: {
                                select: { id: true, name: true, code: true },
                            },
                        },
                    },
                },
                orderBy: { eloPoints: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.user.count({ where }),
        ]);

        res.json({ success: true, users, total, limit: Number(limit), offset: Number(offset) });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/ratings/admin/trigger-batch
 * Superadmin manual trigger for scheduled rating calculations.
 */
ratingsRouter.post('/admin/trigger-batch', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { associationId, mode } = req.body;

        if (!associationId) {
            return res.status(400).json({ success: false, error: 'associationId is required' });
        }

        if (mode === 'LEVEL_EVALUATION') {
            const result = await RatingService.runBiAnnualLevelEvaluation(associationId);
            return res.json({ success: true, result });
        }

        const result = await RatingService.runScheduledBatchRecalculation(associationId);
        res.json({ success: true, result });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});
