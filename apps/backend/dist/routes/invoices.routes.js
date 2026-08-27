"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@areena/shared");
const bexioService_1 = require("../services/bexioService");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
// Helper to check administrative authority over an association or club
function checkBillingAuth(req, associationId, clubId) {
    if (req.user?.isSuperAdmin)
        return true;
    if (associationId) {
        const hasAssocRole = req.user?.associationRoles?.some((r) => r.associationId === associationId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));
        if (hasAssocRole)
            return true;
    }
    if (clubId) {
        const hasClubRole = req.user?.clubRoles?.some((r) => r.clubId === clubId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));
        if (hasClubRole)
            return true;
    }
    return false;
}
// GET /invoices - List invoices with filters
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { associationId, clubId, status, category, search } = req.query;
        const where = {};
        if (associationId) {
            where.associationId = String(associationId);
        }
        if (clubId) {
            where.clubId = String(clubId);
        }
        if (status && Object.values(shared_1.InvoiceStatus).includes(status)) {
            where.status = status;
        }
        if (category && Object.values(shared_1.InvoiceCategory).includes(category)) {
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
        const invoices = await prisma_1.prisma.invoice.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
// GET /invoices/stats - Aggregated KPI billing statistics
router.get('/stats', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { associationId, clubId } = req.query;
        const where = {};
        if (associationId)
            where.associationId = String(associationId);
        if (clubId)
            where.clubId = String(clubId);
        const allInvoices = await prisma_1.prisma.invoice.findMany({
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
        allInvoices.forEach((inv) => {
            totalBilled += inv.totalAmount;
            if (inv.status === shared_1.InvoiceStatus.PAID) {
                totalCollected += inv.totalAmount;
            }
            else if (inv.status === shared_1.InvoiceStatus.SENT || inv.status === shared_1.InvoiceStatus.OVERDUE) {
                totalOutstanding += inv.totalAmount;
                if (new Date(inv.dueDate) < now || inv.status === shared_1.InvoiceStatus.OVERDUE) {
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
    }
    catch (err) {
        next(err);
    }
});
// GET /invoices/bexio/config - Retrieve Bexio integration config
router.get('/bexio/config', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { associationId, clubId } = req.query;
        if (!associationId && !clubId) {
            return res.status(400).json({ error: 'associationId or clubId query parameter required' });
        }
        const config = await prisma_1.prisma.bexioConfig.findFirst({
            where: {
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
            },
        });
        res.json(config || { isConnected: false, autoSync: true });
    }
    catch (err) {
        next(err);
    }
});
// PUT /invoices/bexio/config - Save and verify Bexio configuration
router.put('/bexio/config', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.bexioConfigSchema), async (req, res, next) => {
    try {
        const { associationId, clubId, apiToken, bankAccountId, taxId, paymentTypeId, iban, qrIban, companyName, companyAddress, autoSync, } = req.body;
        if (!checkBillingAuth(req, associationId, clubId)) {
            return res.status(403).json({ error: 'Unauthorized to configure Bexio settings' });
        }
        // Test connection with token
        const testResult = await bexioService_1.BexioService.testConnection(apiToken);
        const isConnected = testResult.connected;
        const existing = await prisma_1.prisma.bexioConfig.findFirst({
            where: {
                ...(associationId ? { associationId } : {}),
                ...(clubId ? { clubId } : {}),
            },
        });
        let saved;
        if (existing) {
            saved = await prisma_1.prisma.bexioConfig.update({
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
        }
        else {
            saved = await prisma_1.prisma.bexioConfig.create({
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
    }
    catch (err) {
        next(err);
    }
});
// GET /invoices/:id - Single invoice
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /invoices - Create new invoice
router.post('/', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.createInvoiceSchema), async (req, res, next) => {
    try {
        const { associationId, clubId, targetType, recipientClubId, recipientUserId, recipientName, recipientEmail, recipientAddress, category, currency, taxRate, issueDate, dueDate, notes, terms, lineItems, syncToBexio, } = req.body;
        if (!checkBillingAuth(req, associationId, clubId)) {
            return res.status(403).json({ error: 'Unauthorized to issue invoices for this organization' });
        }
        // Calculate totals from line items
        let subtotal = 0;
        const formattedItems = lineItems.map((item, idx) => {
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
        const invoiceCount = await prisma_1.prisma.invoice.count();
        const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(4, '0')}`;
        const invoice = await prisma_1.prisma.invoice.create({
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
                status: shared_1.InvoiceStatus.DRAFT,
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
        const bexioConfig = await prisma_1.prisma.bexioConfig.findFirst({
            where: {
                ...(associationId ? { associationId } : {}),
                ...(clubId ? { clubId } : {}),
            },
        });
        if (syncToBexio || (bexioConfig && bexioConfig.autoSync && bexioConfig.isConnected)) {
            const syncRes = await bexioService_1.BexioService.syncInvoice(invoice, bexioConfig);
            if (syncRes.success) {
                const updated = await prisma_1.prisma.invoice.update({
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
                await auditService_1.AuditService.record({
                    req,
                    action: 'INVOICE_CREATE',
                    category: shared_1.AuditCategory.FINANCE,
                    entityType: 'Invoice',
                    entityId: invoice.id,
                    associationId: invoice.associationId,
                    clubId: invoice.clubId,
                    description: `Created invoice #${invoiceNumber} for ${recipientName} (${invoice.currency} ${invoice.totalAmount.toFixed(2)}) & synced to Bexio (#${syncRes.bexioId})`,
                    status: 'SUCCESS',
                    metadata: {
                        invoiceNumber,
                        recipientName,
                        totalAmount: invoice.totalAmount,
                        currency: invoice.currency,
                        category: invoice.category,
                        bexioId: syncRes.bexioId,
                    },
                });
                return res.status(201).json(updated);
            }
        }
        await auditService_1.AuditService.record({
            req,
            action: 'INVOICE_CREATE',
            category: shared_1.AuditCategory.FINANCE,
            entityType: 'Invoice',
            entityId: invoice.id,
            associationId: invoice.associationId,
            clubId: invoice.clubId,
            description: `Created invoice #${invoiceNumber} for ${recipientName} (${invoice.currency} ${invoice.totalAmount.toFixed(2)})`,
            status: 'SUCCESS',
            metadata: {
                invoiceNumber,
                recipientName,
                totalAmount: invoice.totalAmount,
                currency: invoice.currency,
                category: invoice.category,
            },
        });
        res.status(201).json(invoice);
    }
    catch (err) {
        await auditService_1.AuditService.record({
            req,
            action: 'INVOICE_CREATE',
            category: shared_1.AuditCategory.FINANCE,
            entityType: 'Invoice',
            associationId: req.body?.associationId,
            clubId: req.body?.clubId,
            description: `Failed to create invoice: ${err.message}`,
            status: 'FAILURE',
            metadata: { error: err.message },
        });
        next(err);
    }
});
// POST /invoices/:id/send - Mark invoice as SENT
router.post('/:id/send', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id: req.params.id },
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const updated = await prisma_1.prisma.invoice.update({
            where: { id: req.params.id },
            data: {
                status: shared_1.InvoiceStatus.SENT,
            },
            include: {
                lineItems: true,
                recipientClub: true,
                recipientUser: true,
            },
        });
        await auditService_1.AuditService.record({
            req,
            action: 'INVOICE_SEND',
            category: shared_1.AuditCategory.FINANCE,
            entityType: 'Invoice',
            entityId: invoice.id,
            associationId: invoice.associationId,
            clubId: invoice.clubId,
            description: `Issued invoice #${invoice.invoiceNumber} to ${invoice.recipientName} (${invoice.currency} ${invoice.totalAmount.toFixed(2)})`,
            status: 'SUCCESS',
            metadata: {
                invoiceNumber: invoice.invoiceNumber,
                recipientName: invoice.recipientName,
                totalAmount: invoice.totalAmount,
                dueDate: invoice.dueDate,
            },
        });
        res.json({ success: true, invoice: updated });
    }
    catch (err) {
        next(err);
    }
});
// POST /invoices/:id/pay - Mark invoice as PAID
router.post('/:id/pay', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id: req.params.id },
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const updated = await prisma_1.prisma.invoice.update({
            where: { id: req.params.id },
            data: {
                status: shared_1.InvoiceStatus.PAID,
                paidAt: new Date(),
            },
            include: {
                lineItems: true,
            },
        });
        await auditService_1.AuditService.record({
            req,
            action: 'INVOICE_PAY',
            category: shared_1.AuditCategory.FINANCE,
            entityType: 'Invoice',
            entityId: invoice.id,
            associationId: invoice.associationId,
            clubId: invoice.clubId,
            description: `Settled payment for invoice #${invoice.invoiceNumber} (${invoice.currency} ${invoice.totalAmount.toFixed(2)})`,
            status: 'SUCCESS',
            metadata: {
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                paidAt: new Date(),
            },
        });
        res.json({ success: true, invoice: updated });
    }
    catch (err) {
        next(err);
    }
});
// POST /invoices/:id/sync-bexio - Sync invoice to Bexio
router.post('/:id/sync-bexio', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                lineItems: true,
                association: true,
                club: true,
            },
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const bexioConfig = await prisma_1.prisma.bexioConfig.findFirst({
            where: {
                ...(invoice.associationId ? { associationId: invoice.associationId } : {}),
                ...(invoice.clubId ? { clubId: invoice.clubId } : {}),
            },
        });
        const syncResult = await bexioService_1.BexioService.syncInvoice(invoice, bexioConfig);
        if (syncResult.success) {
            const updated = await prisma_1.prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    bexioId: syncResult.bexioId,
                    bexioSyncStatus: syncResult.bexioSyncStatus,
                    bexioSyncedAt: syncResult.bexioSyncedAt,
                },
                include: { lineItems: true },
            });
            await auditService_1.AuditService.record({
                req,
                action: 'BEXIO_SYNC',
                category: shared_1.AuditCategory.FINANCE,
                entityType: 'Invoice',
                entityId: invoice.id,
                associationId: invoice.associationId,
                clubId: invoice.clubId,
                description: `Synchronized invoice #${invoice.invoiceNumber} with Bexio (Bexio ID #${syncResult.bexioId})`,
                status: 'SUCCESS',
                metadata: {
                    invoiceNumber: invoice.invoiceNumber,
                    bexioId: syncResult.bexioId,
                    syncedAt: syncResult.bexioSyncedAt,
                },
            });
            return res.json({ success: true, invoice: updated, syncResult });
        }
        else {
            await prisma_1.prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    bexioSyncStatus: 'FAILED',
                },
            });
            await auditService_1.AuditService.record({
                req,
                action: 'BEXIO_SYNC',
                category: shared_1.AuditCategory.FINANCE,
                entityType: 'Invoice',
                entityId: invoice.id,
                associationId: invoice.associationId,
                clubId: invoice.clubId,
                description: `Failed to synchronize invoice #${invoice.invoiceNumber} with Bexio: ${syncResult.error}`,
                status: 'FAILURE',
                metadata: {
                    invoiceNumber: invoice.invoiceNumber,
                    error: syncResult.error,
                },
            });
            return res.status(400).json({ success: false, error: syncResult.error });
        }
    }
    catch (err) {
        next(err);
    }
});
// GET /invoices/:id/qr-bill - Generate Swiss QR-Bill payload
router.get('/:id/qr-bill', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                lineItems: true,
                association: true,
                club: true,
            },
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        const bexioConfig = await prisma_1.prisma.bexioConfig.findFirst({
            where: {
                ...(invoice.associationId ? { associationId: invoice.associationId } : {}),
                ...(invoice.clubId ? { clubId: invoice.clubId } : {}),
            },
        });
        const qrData = bexioService_1.BexioService.generateSwissQrPayload(invoice, bexioConfig);
        res.json(qrData);
    }
    catch (err) {
        next(err);
    }
});
// DELETE /invoices/:id - Cancel or delete invoice
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id: req.params.id },
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (!checkBillingAuth(req, invoice.associationId, invoice.clubId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (invoice.status === shared_1.InvoiceStatus.DRAFT) {
            await prisma_1.prisma.invoice.delete({ where: { id: req.params.id } });
            return res.json({ success: true, deleted: true });
        }
        else {
            const updated = await prisma_1.prisma.invoice.update({
                where: { id: req.params.id },
                data: { status: shared_1.InvoiceStatus.CANCELLED },
            });
            return res.json({ success: true, invoice: updated });
        }
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
