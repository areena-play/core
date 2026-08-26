import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
    createInvoiceSchema,
    updateInvoiceSchema,
    bexioConfigSchema,
    InvoiceStatus,
    InvoiceCategory,
} from '@areena/shared';
import { BexioService } from '../services/bexioService';

const router = Router();

// Helper to check administrative authority over an association or club
function checkBillingAuth(req: AuthRequest, associationId?: string | null, clubId?: string | null): boolean {
    if (req.user?.isSuperAdmin) return true;

    if (associationId) {
        const hasAssocRole = req.user?.associationRoles?.some(
            (r: any) =>
                r.associationId === associationId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );
        if (hasAssocRole) return true;
    }

    if (clubId) {
        const hasClubRole = req.user?.clubRoles?.some(
            (r: any) => r.clubId === clubId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );
        if (hasClubRole) return true;
    }

    return false;
}

// GET /invoices - List invoices with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { associationId, clubId, status, category, search } = req.query;

        const where: any = {};

        if (associationId) {
            where.associationId = String(associationId);
        }
        if (clubId) {
            where.clubId = String(clubId);
        }
        if (status && Object.values(InvoiceStatus).includes(status as any)) {
            where.status = status;
        }
        if (category && Object.values(InvoiceCategory).includes(category as any)) {
            where.category = category;
        }
        if (search) {
            const query = String(search);
            where.OR = [
                { invoiceNumber: { contains: query, mode: 'insensitive' } },
                { recipientName: { contains: query, mode: 'insensitive' } },
                { recipientEmail: { contains: query, mode: 'insensitive' } },
            ];
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                lineItems: {
                    orderBy: { position: 'asc' },
                },
                association: {
                    select: { id: true, name: true, shortName: true, code: true, logoUrl: true },
                },
                club: {
                    select: { id: true, name: true, code: true },
                },
                recipientClub: {
                    select: { id: true, name: true, code: true, email: true, address: true, city: true },
                },
                recipientUser: {
                    select: { id: true, firstName: true, lastName: true, email: true, licenseId: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(invoices);
    } catch (err) {
        next(err);
    }
});

// GET /invoices/stats - Aggregated KPI billing statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { associationId, clubId } = req.query;
        const where: any = {};
        if (associationId) where.associationId = String(associationId);
        if (clubId) where.clubId = String(clubId);

        const allInvoices = await prisma.invoice.findMany({
            where,
            select: {
                totalAmount: true,
                status: true,
                bexioSyncStatus: true,
                dueDate: true,
            },
        });

        const now = new Date();
        let totalBilled = 0;
        let totalCollected = 0;
        let totalOutstanding = 0;
        let totalOverdue = 0;
        let bexioSyncedCount = 0;
        let overdueCount = 0;

        allInvoices.forEach((inv: any) => {
            totalBilled += inv.totalAmount;
            if (inv.status === InvoiceStatus.PAID) {
                totalCollected += inv.totalAmount;
            } else if (inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE) {
                totalOutstanding += inv.totalAmount;
                if (new Date(inv.dueDate) < now || inv.status === InvoiceStatus.OVERDUE) {
                    totalOverdue += inv.totalAmount;
                    overdueCount++;
                }
            }
            if (inv.bexioSyncStatus === 'SYNCED') {
                bexioSyncedCount++;
            }
        });

        res.json({
            totalBilled,
            totalCollected,
            totalOutstanding,
            totalOverdue,
            totalCount: allInvoices.length,
            bexioSyncedCount,
            overdueCount,
            currency: 'CHF',
        });
    } catch (err) {
        next(err);
    }
});

// GET /invoices/bexio/config - Retrieve Bexio integration config
router.get('/bexio/config', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { associationId, clubId } = req.query;
        if (!associationId && !clubId) {
            return res.status(400).json({ error: 'associationId or clubId query parameter required' });
        }

        const config = await prisma.bexioConfig.findFirst({
            where: {
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
            },
        });

        res.json(config || { isConnected: false, autoSync: true });
    } catch (err) {
        next(err);
    }
});

// PUT /invoices/bexio/config - Save and verify Bexio configuration
router.put(
    '/bexio/config',
    authenticateToken,
    validate(bexioConfigSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const {
                associationId,
                clubId,
                apiToken,
                bankAccountId,
                taxId,
                paymentTypeId,
                iban,
                qrIban,
                companyName,
                companyAddress,
                autoSync,
            } = req.body;

            if (!checkBillingAuth(req, associationId, clubId)) {
                return res.status(403).json({ error: 'Unauthorized to configure Bexio settings' });
            }

            // Test connection with token
            const testResult = await BexioService.testConnection(apiToken);
            const isConnected = testResult.connected;

            const existing = await prisma.bexioConfig.findFirst({
                where: {
                    ...(associationId ? { associationId } : {}),
                    ...(clubId ? { clubId } : {}),
                },
            });

            let saved;
            if (existing) {
                saved = await prisma.bexioConfig.update({
                    where: { id: existing.id },
                    data: {
                        apiToken,
                        bankAccountId,
                        taxId,
                        paymentTypeId,
                        iban,
                        qrIban,
                        companyName: companyName || testResult.companyName,
                        companyAddress,
                        autoSync: autoSync ?? true,
                        isConnected,
                        lastSyncAt: isConnected ? new Date() : existing.lastSyncAt,
                    },
                });
            } else {
                saved = await prisma.bexioConfig.create({
                    data: {
                        associationId: associationId || null,
                        clubId: clubId || null,
                        apiToken,
                        bankAccountId,
                        taxId,
                        paymentTypeId,
                        iban,
                        qrIban,
                        companyName: companyName || testResult.companyName,
                        companyAddress,
                        autoSync: autoSync ?? true,
                        isConnected,
                        lastSyncAt: isConnected ? new Date() : null,
                    },
                });
            }

            res.json({
                config: saved,
                testResult,
            });
        } catch (err) {
            next(err);
        }
    },
);

// GET /invoices/:id - Single invoice
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                lineItems: {
                    orderBy: { position: 'asc' },
                },
                association: true,
                club: true,
                recipientClub: true,
                recipientUser: true,
            },
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (err) {
        next(err);
    }
});

// POST /invoices - Create new invoice
router.post('/', authenticateToken, validate(createInvoiceSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const {
            associationId,
            clubId,
            targetType,
            recipientClubId,
            recipientUserId,
            recipientName,
            recipientEmail,
            recipientAddress,
            category,
            currency,
            taxRate,
            issueDate,
            dueDate,
            notes,
            terms,
            lineItems,
            syncToBexio,
        } = req.body;

        if (!checkBillingAuth(req, associationId, clubId)) {
            return res.status(403).json({ error: 'Unauthorized to issue invoices for this organization' });
        }

        // Calculate totals from line items
        let subtotal = 0;
        const formattedItems = lineItems.map((item: any, idx: number) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unitPrice) || 0;
            const lineTotal = Math.round(qty * price * 100) / 100;
            subtotal += lineTotal;
            return {
                position: idx + 1,
                description: item.description,
                quantity: qty,
                unit: item.unit || 'pc',
                unitPrice: price,
                totalPrice: lineTotal,
                taxRate: item.taxRate ?? taxRate ?? 0,
                bexioArticleId: item.bexioArticleId || null,
            };
        });

        const taxPct = Number(taxRate) || 0;
        const taxAmount = Math.round(((subtotal * taxPct) / 100) * 100) / 100;
        const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

        // Auto-generate invoice number (INV-YYYY-XXXX)
        const year = new Date().getFullYear();
        const invoiceCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(4, '0')}`;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                associationId: associationId || null,
                clubId: clubId || null,
                targetType,
                recipientClubId: recipientClubId || null,
                recipientUserId: recipientUserId || null,
                recipientName,
                recipientEmail: recipientEmail || null,
                recipientAddress: recipientAddress || null,
                status: InvoiceStatus.DRAFT,
                category,
                currency: currency || 'CHF',
                subtotal,
                taxRate: taxPct,
                taxAmount,
                totalAmount,
                issueDate: issueDate ? new Date(issueDate) : new Date(),
                dueDate: new Date(dueDate),
                notes: notes || null,
                terms: terms || null,
                lineItems: {
                    create: formattedItems,
                },
            },
            include: {
                lineItems: true,
                association: true,
                club: true,
                recipientClub: true,
                recipientUser: true,
            },
        });

        // Trigger Bexio sync if requested or if autoSync is enabled
        const bexioConfig = await prisma.bexioConfig.findFirst({
            where: {
                ...(associationId ? { associationId } : {}),
                ...(clubId ? { clubId } : {}),
            },
        });

        if (syncToBexio || (bexioConfig && bexioConfig.autoSync && bexioConfig.isConnected)) {
            const syncRes = await BexioService.syncInvoice(invoice as any, bexioConfig);
            if (syncRes.success) {
                const updated = await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        bexioId: syncRes.bexioId,
                        bexioSyncStatus: syncRes.bexioSyncStatus,
                        bexioSyncedAt: syncRes.bexioSyncedAt,
                    },
                    include: {
                        lineItems: true,
                    },
                });
                return res.status(201).json(updated);
            }
        }

        res.status(201).json(invoice);
    } catch (err) {
        next(err);
    }
});

// POST /invoices/:id/send - Mark invoice as SENT
router.post('/:id/send', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.invoice.update({
            where: { id: req.params.id },
            data: {
                status: InvoiceStatus.SENT,
            },
            include: {
                lineItems: true,
                recipientClub: true,
                recipientUser: true,
            },
        });

        res.json({ success: true, invoice: updated });
    } catch (err) {
        next(err);
    }
});

// POST /invoices/:id/pay - Mark invoice as PAID
router.post('/:id/pay', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.invoice.update({
            where: { id: req.params.id },
            data: {
                status: InvoiceStatus.PAID,
                paidAt: new Date(),
            },
            include: {
                lineItems: true,
            },
        });

        res.json({ success: true, invoice: updated });
    } catch (err) {
        next(err);
    }
});

// POST /invoices/:id/sync-bexio - Sync invoice to Bexio
router.post('/:id/sync-bexio', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                lineItems: true,
                association: true,
                club: true,
            },
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const bexioConfig = await prisma.bexioConfig.findFirst({
            where: {
                ...(invoice.associationId ? { associationId: invoice.associationId } : {}),
                ...(invoice.clubId ? { clubId: invoice.clubId } : {}),
            },
        });

        const syncResult = await BexioService.syncInvoice(invoice as any, bexioConfig);

        if (syncResult.success) {
            const updated = await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    bexioId: syncResult.bexioId,
                    bexioSyncStatus: syncResult.bexioSyncStatus,
                    bexioSyncedAt: syncResult.bexioSyncedAt,
                },
                include: { lineItems: true },
            });
            return res.json({ success: true, invoice: updated, syncResult });
        } else {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    bexioSyncStatus: 'FAILED',
                },
            });
            return res.status(400).json({ success: false, error: syncResult.error });
        }
    } catch (err: any) {
        next(err);
    }
});

// GET /invoices/:id/qr-bill - Generate Swiss QR-Bill payload
router.get('/:id/qr-bill', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                lineItems: true,
                association: true,
                club: true,
            },
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const bexioConfig = await prisma.bexioConfig.findFirst({
            where: {
                ...(invoice.associationId ? { associationId: invoice.associationId } : {}),
                ...(invoice.clubId ? { clubId: invoice.clubId } : {}),
            },
        });

        const qrData = BexioService.generateSwissQrPayload(invoice as any, bexioConfig);
        res.json(qrData);
    } catch (err) {
        next(err);
    }
});

// DELETE /invoices/:id - Cancel or delete invoice
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (invoice.status === InvoiceStatus.DRAFT) {
            await prisma.invoice.delete({ where: { id: req.params.id } });
            return res.json({ success: true, deleted: true });
        } else {
            const updated = await prisma.invoice.update({
                where: { id: req.params.id },
                data: { status: InvoiceStatus.CANCELLED },
            });
            return res.json({ success: true, invoice: updated });
        }
    } catch (err) {
        next(err);
    }
});

export default router;

