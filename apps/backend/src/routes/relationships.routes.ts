import express, { Response } from 'express';
import { RelationshipsService } from '../services/relationships.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /relationships/managed - Get all profiles managed by current user
router.get('/managed', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user!.id;
        const profiles = await RelationshipsService.getManagedProfiles(userId);
        res.json({ success: true, count: profiles.length, profiles });
    } catch (err) {
        next(err);
    }
});

// GET /relationships/guardians/:userId - Get all guardians for a specific dependent
router.get('/guardians/:userId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const managedUserId = req.params.userId;
        const guardians = await RelationshipsService.getGuardians(managedUserId);
        res.json({ success: true, guardians });
    } catch (err) {
        next(err);
    }
});

// POST /relationships/dependent - Create a new managed dependent profile
router.post('/dependent', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const managerUserId = req.user!.id;
        const { firstName, lastName, birthDate, gender, clubId, emergencyPhone, relationshipType, permission } = req.body;

        const result = await RelationshipsService.createManagedDependent(
            managerUserId,
            { firstName, lastName, birthDate, gender, clubId, emergencyPhone },
            relationshipType || 'PARENT_GUARDIAN',
            permission || 'FULL_MANAGEMENT'
        );

        res.status(201).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
});

// POST /relationships/co-guardian - Add a co-guardian to a dependent
router.post('/co-guardian', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const actorUserId = req.user!.id;
        const { managedUserId, coGuardianIdentifier, type, permission, emergencyPhone } = req.body;

        if (!managedUserId || !coGuardianIdentifier) {
            return res.status(400).json({ error: 'managedUserId and coGuardianIdentifier are required' });
        }

        const record = await RelationshipsService.addCoGuardian(
            actorUserId,
            managedUserId,
            coGuardianIdentifier,
            type || 'PARENT_GUARDIAN',
            permission || 'FULL_MANAGEMENT',
            emergencyPhone
        );

        res.json({ success: true, relationship: record });
    } catch (err) {
        next(err);
    }
});

// POST /relationships/invite-claim/:userId - Generate account claim invite
router.post('/invite-claim/:userId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const actorUserId = req.user!.id;
        const managedUserId = req.params.userId;

        const invite = await RelationshipsService.createClaimInvite(actorUserId, managedUserId);
        res.json({ success: true, invite });
    } catch (err) {
        next(err);
    }
});

// POST /relationships/claim - Claim account with token and choose credentials
router.post('/claim', async (req, res, next) => {
    try {
        const { claimToken, email, password } = req.body;
        if (!claimToken || !email || !password) {
            return res.status(400).json({ error: 'claimToken, email, and password are required' });
        }

        const updatedPlayer = await RelationshipsService.claimAccount(claimToken, email, password);
        res.json({
            success: true,
            message: 'Account successfully claimed! You can now log in with your credentials.',
            user: {
                id: updatedPlayer.id,
                email: updatedPlayer.email,
                firstName: updatedPlayer.firstName,
                lastName: updatedPlayer.lastName,
            },
        });
    } catch (err) {
        next(err);
    }
});

// DELETE /relationships/:id - Remove a guardianship/delegation link
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const actorUserId = req.user!.id;
        const relationshipId = req.params.id;

        const result = await RelationshipsService.removeRelationship(actorUserId, relationshipId);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
