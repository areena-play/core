import { Router, Response } from 'express';
import { authenticateToken, requirePro, AuthRequest } from '../middleware/auth';
import { GeminiService } from '../services/gemini.service';
import { prisma } from '../config/prisma';

const router = Router();

/**
 * POST /api/ai/match-analysis/:matchId
 * Generate an in-depth AI tactical breakdown of a completed match (Pro Subscription Only)
 */
router.post('/match-analysis/:matchId', authenticateToken as any, requirePro as any, async (req: AuthRequest, res: Response) => {
    try {
        const { matchId } = req.params;

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                homePlayer1: { select: { id: true, firstName: true, lastName: true, rank: true, currentLevel: true } },
                homePlayer2: { select: { id: true, firstName: true, lastName: true } },
                awayPlayer1: { select: { id: true, firstName: true, lastName: true, rank: true, currentLevel: true } },
                awayPlayer2: { select: { id: true, firstName: true, lastName: true } },
                encounter: {
                    include: {
                        homeTeam: { select: { id: true, name: true } },
                        awayTeam: { select: { id: true, name: true } },
                        category: {
                            include: {
                                competition: { select: { id: true, name: true, type: true } },
                            },
                        },
                        group: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const analysis = await GeminiService.generateMatchAnalysis(match, req.user?.id);

        res.json({
            success: true,
            matchId,
            analysis,
        });
    } catch (err: any) {
        console.error('AI Match Analysis Error:', err);
        res.status(500).json({
            error: 'Failed to generate AI match analysis',
            details: err.message || 'Internal error',
        });
    }
});

/**
 * POST /api/ai/suggest-phonetics
 * Auto-suggest phonetic pronunciation spelling for user's name
 */
router.post('/suggest-phonetics', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const { firstName, lastName, languageHint } = req.body;

        const targetFirst = firstName || req.user?.firstName || '';
        const targetLast = lastName || req.user?.lastName || '';

        if (!targetFirst && !targetLast) {
            return res.status(400).json({ error: 'First name and last name are required' });
        }

        const suggestion = await GeminiService.suggestPhoneticSpelling(
            targetFirst,
            targetLast,
            languageHint || 'German / Swiss German / International'
        );

        res.json({
            success: true,
            suggestion,
        });
    } catch (err: any) {
        console.error('AI Suggest Phonetics Error:', err);
        res.status(500).json({
            error: 'Failed to suggest phonetic spelling',
            details: err.message,
        });
    }
});

/**
 * POST /api/ai/validate-phonetics
 * Validate user-entered phonetic spelling for safety, decency, and acoustic similarity
 */
router.post('/validate-phonetics', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const { realFirstName, realLastName, phoneticFirstName, phoneticLastName } = req.body;

        const fName = realFirstName || req.user?.firstName || '';
        const lName = realLastName || req.user?.lastName || '';

        const validation = await GeminiService.validatePhoneticName(
            fName,
            lName,
            phoneticFirstName,
            phoneticLastName
        );

        res.json(validation);
    } catch (err: any) {
        console.error('AI Validate Phonetics Error:', err);
        res.status(500).json({
            isValid: true, // Non-blocking fallback
            reason: 'Could not validate at this time.',
        });
    }
});

export default router;
