import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { playerTtsRateLimiter } from '../middleware/rateLimit';
import { GoogleTtsService } from '../services/tts.service';
import { prisma } from '../config/prisma';

const router = Router();

/**
 * POST /api/tts/preview
 * Rate-limited endpoint for athletes to test their name pronunciation
 */
router.post('/preview', authenticateToken as any, playerTtsRateLimiter as any, async (req: AuthRequest, res: Response) => {
    try {
        const { phoneticFirstName, phoneticLastName } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            select: { firstName: true, lastName: true, phoneticFirstName: true, phoneticLastName: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const pFirst = phoneticFirstName !== undefined ? phoneticFirstName : user.phoneticFirstName;
        const pLast = phoneticLastName !== undefined ? phoneticLastName : user.phoneticLastName;

        const result = await GoogleTtsService.synthesizeAthletePronunciation(
            user.firstName,
            user.lastName,
            pFirst,
            pLast
        );

        res.json({
            success: true,
            audioBase64: result.audioBase64,
            mimeType: result.mimeType,
            spokenText: result.spokenText,
            voiceName: result.voiceName,
        });
    } catch (err: any) {
        console.error('TTS Preview Error:', err);
        res.status(500).json({
            error: 'Failed to synthesize pronunciation preview',
            details: err.message,
        });
    }
});

/**
 * POST /api/tts/synthesize-announcement
 * Endpoint for tournament speaker callouts and organizers
 */
router.post('/synthesize-announcement', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const { tableNumber, homePlayerName, awayPlayerName, text, competitionTitle, languageCode } = req.body;

        let result;
        if (text) {
            result = await GoogleTtsService.synthesizeSpeech(text, { languageCode });
        } else if (tableNumber && homePlayerName && awayPlayerName) {
            result = await GoogleTtsService.synthesizeMatchCallout(
                tableNumber,
                homePlayerName,
                awayPlayerName,
                competitionTitle,
                languageCode
            );
        } else {
            return res.status(400).json({ error: 'Either custom text or match details (tableNumber, homePlayerName, awayPlayerName) are required.' });
        }

        res.json({
            success: true,
            audioBase64: result.audioBase64,
            mimeType: result.mimeType,
            spokenText: result.spokenText,
        });
    } catch (err: any) {
        console.error('TTS Announcement Error:', err);
        res.status(500).json({
            error: 'Failed to synthesize announcement speech',
            details: err.message,
        });
    }
});

export default router;

