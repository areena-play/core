import { Router, Response } from 'express';
import { SupportService } from '../services/support.service';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { AuditCategory } from '@areena/shared';
import { prisma } from '../config/prisma';

const router = Router();

/**
 * GET /support/faqs
 * Public / Authenticated retrieval of FAQs for a given context
 */
router.get('/faqs', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { contextType, contextId, category, search } = req.query;
        const faqs = await SupportService.getFaqs({
            contextType: contextType as string,
            contextId: contextId as string,
            category: category as string,
            search: search as string,
        });

        res.json(faqs);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /support/subjects
 * Public / Authenticated retrieval of subjects for a given context
 */
router.get('/subjects', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { contextType, contextId } = req.query;
        const subjects = await SupportService.getSubjects({
            contextType: contextType as string,
            contextId: contextId as string,
        });

        res.json(subjects);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /support/inquire
 * Public contact form submission
 */
router.post('/inquire', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const {
            name,
            email,
            subjectId,
            customSubjectTitle,
            contextType,
            contextId,
            message,
            faqsConfirmed,
        } = req.body;

        if (!faqsConfirmed) {
            return res.status(400).json({
                error: 'You must confirm that you have reviewed the FAQs before submitting your inquiry.',
            });
        }

        if (!name || !email || !message) {
            return res.status(400).json({
                error: 'Name, email, and message are required fields.',
            });
        }

        const inquiry = await SupportService.submitInquiry({
            name,
            email,
            userId: req.user?.id,
            subjectId,
            customSubjectTitle,
            contextType,
            contextId,
            message,
            faqsConfirmed: Boolean(faqsConfirmed),
        });

        res.status(201).json({
            success: true,
            ticketNumber: inquiry.ticketNumber,
            message: 'Your support inquiry has been submitted successfully. A confirmation receipt has been sent to your email.',
            inquiry,
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to submit support inquiry' });
    }
});

// ============================================================================
// ADMIN MANAGEMENT ROUTES
// ============================================================================

/**
 * Helper to check whether requesting user has admin rights for context
 */
async function hasAdminRightsForContext(user: any, associationId?: string | null, clubId?: string | null, competitionId?: string | null) {
    if (!user) return false;
    if (user.isSuperAdmin) return true;

    if (associationId) {
        const hasRole = user.associationRoles?.some((r: any) => r.associationId === associationId);
        if (hasRole) return true;
    }

    if (clubId) {
        const hasRole = user.clubRoles?.some((r: any) => r.clubId === clubId);
        if (hasRole) return true;
    }

    if (competitionId) {
        const comp = await prisma.competition.findUnique({
            where: { id: competitionId },
            select: { associationId: true },
        });
        if (comp && user.associationRoles?.some((r: any) => r.associationId === comp.associationId)) {
            return true;
        }
    }

    // If global (no entity ID), only Super Admin
    if (!associationId && !clubId && !competitionId) {
        return user.isSuperAdmin;
    }

    return false;
}

/**
 * POST /support/admin/faqs
 */
router.post('/admin/faqs', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { question, answer, questionI18n, answerI18n, category, categoryI18n, order, associationId, clubId, competitionId } = req.body;

        const isAllowed = await hasAdminRightsForContext(user, associationId, clubId, competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to create FAQs for this context.' });
        }

        const faq = await SupportService.createFaq({
            question,
            answer,
            questionI18n,
            answerI18n,
            category,
            categoryI18n,
            order,
            associationId,
            clubId,
            competitionId,
            createdById: user.id,
        });

        await AuditService.record({
            req,
            action: 'CREATE_FAQ',
            category: AuditCategory.COMMUNICATION,
            entityType: 'FaqItem',
            entityId: faq.id,
            associationId,
            clubId,
            description: `Created FAQ item: "${question}"`,
        });

        res.status(201).json(faq);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /support/admin/faqs/:id
 */
router.put('/admin/faqs/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.faqItem.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'FAQ item not found' });
        }

        const isAllowed = await hasAdminRightsForContext(user, existing.associationId, existing.clubId, existing.competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to edit this FAQ item.' });
        }

        const updated = await SupportService.updateFaq(id, req.body);

        await AuditService.record({
            req,
            action: 'UPDATE_FAQ',
            category: AuditCategory.COMMUNICATION,
            entityType: 'FaqItem',
            entityId: id,
            associationId: existing.associationId,
            clubId: existing.clubId,
            description: `Updated FAQ item: "${updated.question}"`,
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /support/admin/faqs/:id
 */
router.delete('/admin/faqs/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.faqItem.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'FAQ item not found' });
        }

        const isAllowed = await hasAdminRightsForContext(user, existing.associationId, existing.clubId, existing.competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to delete this FAQ item.' });
        }

        await SupportService.deleteFaq(id);

        await AuditService.record({
            req,
            action: 'DELETE_FAQ',
            category: AuditCategory.COMMUNICATION,
            entityType: 'FaqItem',
            entityId: id,
            associationId: existing.associationId,
            clubId: existing.clubId,
            description: `Deleted FAQ item: "${existing.question}"`,
        });

        res.json({ success: true, message: 'FAQ item deleted successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /support/admin/subjects
 */
router.post('/admin/subjects', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { title, titleI18n, description, descriptionI18n, targetType, recipientEmail, associationId, clubId, competitionId, isSystem, order } = req.body;

        const isAllowed = await hasAdminRightsForContext(user, associationId, clubId, competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to create support subjects for this context.' });
        }

        const subject = await SupportService.createSubject({
            title,
            titleI18n,
            description,
            descriptionI18n,
            targetType,
            recipientEmail,
            associationId,
            clubId,
            competitionId,
            isSystem: user.isSuperAdmin ? Boolean(isSystem) : false,
            order,
        });

        res.status(201).json(subject);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /support/admin/subjects/:id
 */
router.put('/admin/subjects/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.supportSubject.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Support subject not found' });
        }

        const isAllowed = await hasAdminRightsForContext(user, existing.associationId, existing.clubId, existing.competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to edit this subject.' });
        }

        const updated = await SupportService.updateSubject(id, req.body);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /support/admin/subjects/:id
 */
router.delete('/admin/subjects/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.supportSubject.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Support subject not found' });
        }

        const isAllowed = await hasAdminRightsForContext(user, existing.associationId, existing.clubId, existing.competitionId);
        if (!isAllowed) {
            return res.status(403).json({ error: 'You do not have permission to delete this subject.' });
        }

        await SupportService.deleteSubject(id);
        res.json({ success: true, message: 'Support subject deleted' });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /support/admin/inquiries
 */
router.get('/admin/inquiries', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { contextType, contextId, status } = req.query;

        const isAllowed = await hasAdminRightsForContext(user, contextType === 'ASSOCIATION' ? contextId as string : null, contextType === 'CLUB' ? contextId as string : null, contextType === 'TOURNAMENT' ? contextId as string : null);
        if (!isAllowed) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const inquiries = await SupportService.getInquiries({
            contextType: contextType as string,
            contextId: contextId as string,
            status: status as string,
        });

        res.json(inquiries);
    } catch (err) {
        next(err);
    }
});

export default router;
