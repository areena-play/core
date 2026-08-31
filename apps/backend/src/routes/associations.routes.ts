import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { S3Service } from '../services/s3.service';
import { config } from '../config/env';
import {
    createAssociationSchema,
    updateLicenseIdTemplateSchema,
    updateAssociationSettingsSchema,
    AuditCategory,
} from '@areena/shared';
import { HierarchyService } from '../services/hierarchy.service';
import { AuditService } from '../services/audit.service';

const router = Router();
const uploadLogo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (PNG, JPG, SVG, WebP) are allowed'));
        }
    },
});

function extractS3KeyFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const uploadFileIndex = url.indexOf('/upload/file/');
    if (uploadFileIndex !== -1) {
        return url.substring(uploadFileIndex + '/upload/file/'.length).split('?')[0];
    }
    const bucketIndex = url.indexOf(`/${config.s3.bucketName}/`);
    if (bucketIndex !== -1) {
        return url.substring(bucketIndex + `/${config.s3.bucketName}/`.length).split('?')[0];
    }
    if (url.startsWith('associations/logos/')) {
        return url.split('?')[0];
    }
    return null;
}

// GET /associations - Full hierarchy & tree
router.get('/', async (req, res, next) => {
    try {
        const hierarchy = await HierarchyService.getFullHierarchy();
        res.json(hierarchy);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id - Single association details
router.get('/:id', async (req, res, next) => {
    try {
        const idOrSlug = req.params.id;
        const association = await prisma.association.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug.toLowerCase() },
                    { code: idOrSlug.toUpperCase() },
                ],
            },
            include: {
                parentHierarchies: { include: { parent: true } },
                childHierarchies: { include: { child: true } },
                clubAssociations: { include: { club: true } },
                seasons: { orderBy: { startDate: 'desc' } },
                adminRoles: { include: { user: true } },
            },
        });

        if (!association) {
            return res.status(404).json({ error: 'Association not found' });
        }

        res.json(association);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id/rules - Effective rules with national overrides
router.get('/:id/rules', async (req, res, next) => {
    try {
        const idOrSlug = req.params.id;
        const assoc = await prisma.association.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug.toLowerCase() },
                    { code: idOrSlug.toUpperCase() },
                ],
            },
        });

        if (!assoc) {
            return res.status(404).json({ error: 'Association not found' });
        }

        const effectiveRules = await HierarchyService.getEffectiveRules(assoc.id);
        res.json(effectiveRules);
    } catch (err) {
        next(err);
    }
});

// POST /associations - Create sub-association
router.post(
    '/',
    authenticateToken,
    requireSuperAdmin,
    validate(createAssociationSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const {
                name,
                shortName,
                code,
                slug: customSlug,
                level,
                isTopLevel,
                parentAssociationIds,
                rules,
                licenseIdTemplate,
                regionDigit,
            } = req.body;

            const existingCode = await prisma.association.findUnique({ where: { code } });
            if (existingCode) {
                return res.status(400).json({ error: `Association with code '${code}' already exists` });
            }

            const finalSlug = customSlug ? customSlug.trim().toLowerCase() : (code ? code.toLowerCase() : shortName.toLowerCase());
            const existingSlug = await prisma.association.findUnique({ where: { slug: finalSlug } });
            if (existingSlug) {
                return res.status(400).json({ error: `Association with slug '${finalSlug}' already exists` });
            }

            const association = await prisma.association.create({
                data: {
                    name,
                    shortName,
                    code,
                    slug: finalSlug,
                    level,
                    isTopLevel: !!isTopLevel,
                    rules: rules || {},
                    licenseIdTemplate: licenseIdTemplate || '{regionDigit}{year2}{counter3}',
                    regionDigit: regionDigit || 1,
                },
            });

            // Link parent associations (DAG)
            if (parentAssociationIds && parentAssociationIds.length > 0) {
                await prisma.associationHierarchy.createMany({
                    data: parentAssociationIds.map((parentId: string) => ({
                        parentId,
                        childId: association.id,
                    })),
                });
            }

            await AuditService.record({
                req,
                action: 'ASSOCIATION_CREATE',
                category: AuditCategory.GOVERNANCE,
                entityType: 'Association',
                entityId: association.id,
                associationId: association.id,
                description: `Created sub-association "${association.name}" (${association.code})`,
                status: 'SUCCESS',
                metadata: {
                    name: association.name,
                    code: association.code,
                    level: association.level,
                },
            });

            res.status(201).json(association);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /associations/:id/settings - Main association general settings & license template
router.put(
    '/:id/settings',
    authenticateToken,
    validate(updateAssociationSettingsSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const targetAssoc = await prisma.association.findUnique({ where: { id: req.params.id } });
            if (!targetAssoc) {
                return res.status(404).json({ error: 'Association not found' });
            }

            // Must be super admin or association admin
            const isAuthorized =
                req.user?.isSuperAdmin ||
                req.user?.associationRoles.some(
                    (r: any) => r.associationId === targetAssoc.id && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
                );
            if (!isAuthorized) {
                return res
                    .status(403)
                    .json({ error: 'Only association administrators can update association settings' });
            }

            const { name, shortName, logoUrl, licenseIdTemplate, counter, regionDigit, rules, expectedUpdatedAt } = req.body;

            // Optimistic concurrency control check
            if (expectedUpdatedAt && new Date(targetAssoc.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) {
                return res.status(409).json({
                    error: 'Conflict: Association settings were modified by another administrator. Please refresh before saving.',
                });
            }

            const updated = await prisma.association.update({
                where: { id: req.params.id },
                data: {
                    ...(name ? { name } : {}),
                    ...(shortName ? { shortName } : {}),
                    ...(logoUrl !== undefined ? { logoUrl } : {}),
                    ...(licenseIdTemplate ? { licenseIdTemplate } : {}),
                    ...(counter !== undefined ? { licenseCounter: counter } : {}),
                    ...(regionDigit !== undefined ? { regionDigit } : {}),
                    ...(rules !== undefined ? { rules } : {}),
                },
            });

            await AuditService.record({
                req,
                action: 'ASSOCIATION_SETTINGS_UPDATE',
                category: AuditCategory.GOVERNANCE,
                entityType: 'Association',
                entityId: updated.id,
                associationId: updated.id,
                description: `Updated settings for association "${updated.name}" (${updated.code})`,
                status: 'SUCCESS',
                metadata: {
                    updatedFields: Object.keys(req.body),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /associations/:id/settings/license-template - Main association settings for License ID format
router.put(
    '/:id/settings/license-template',
    authenticateToken,
    validate(updateLicenseIdTemplateSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const targetAssoc = await prisma.association.findUnique({ where: { id: req.params.id } });
            if (!targetAssoc) {
                return res.status(404).json({ error: 'Association not found' });
            }

            // Must be super admin or main association admin
            const isMainAdmin =
                req.user?.isSuperAdmin || req.user?.associationRoles.some((r: any) => r.associationId === targetAssoc.id);
            if (!isMainAdmin) {
                return res
                    .status(403)
                    .json({ error: 'Only main association administrators can update the license ID template' });
            }

            const { licenseIdTemplate, counter } = req.body;

            const updated = await prisma.association.update({
                where: { id: req.params.id },
                data: {
                    licenseIdTemplate,
                    ...(counter !== undefined ? { licenseCounter: counter } : {}),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// POST /associations/:id/logo - Upload Association Logo to S3
router.post(
    '/:id/logo',
    authenticateToken,
    uploadLogo.single('logo'),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const targetAssoc = await prisma.association.findUnique({ where: { id: req.params.id } });
            if (!targetAssoc) {
                return res.status(404).json({ error: 'Association not found' });
            }

            // Must be super admin or association admin
            const isAuthorized =
                req.user?.isSuperAdmin ||
                req.user?.associationRoles.some(
                    (r: any) => r.associationId === targetAssoc.id && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
                );
            if (!isAuthorized) {
                return res
                    .status(403)
                    .json({ error: 'Only association administrators can upload the association logo' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No logo image file provided' });
            }

            // If there is an existing logo in S3, delete the previous file to save storage
            if (targetAssoc.logoUrl) {
                const oldKey = extractS3KeyFromUrl(targetAssoc.logoUrl);
                if (oldKey) {
                    try {
                        await S3Service.deleteFile(oldKey);
                        console.log(`[S3] Cleaned up replaced logo: ${oldKey}`);
                    } catch (delErr: any) {
                        console.warn(`[S3] Notice on cleaning up old logo: ${delErr.message}`);
                    }
                }
            }

            const uploadResult = await S3Service.uploadFile(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'associations/logos',
            );

            const updated = await prisma.association.update({
                where: { id: req.params.id },
                data: {
                    logoUrl: uploadResult.fileUrl,
                },
            });

            await AuditService.record({
                req,
                action: 'ASSOCIATION_LOGO_UPLOAD',
                category: AuditCategory.GOVERNANCE,
                entityType: 'Association',
                entityId: updated.id,
                associationId: updated.id,
                description: `Uploaded official logo for association "${updated.name}" (${updated.code})`,
                status: 'SUCCESS',
                metadata: {
                    fileUrl: uploadResult.fileUrl,
                    s3Key: uploadResult.key,
                },
            });

            res.status(200).json({
                success: true,
                logoUrl: uploadResult.fileUrl,
                key: uploadResult.key,
                association: updated,
            });
        } catch (err: any) {
            res.status(500).json({ error: 'Logo upload failed', details: err.message });
        }
    },
);

// DELETE /associations/:id/logo - Remove Association Logo & delete from S3
router.delete('/:id/logo', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const targetAssoc = await prisma.association.findUnique({ where: { id: req.params.id } });
        if (!targetAssoc) {
            return res.status(404).json({ error: 'Association not found' });
        }

        const isAuthorized =
            req.user?.isSuperAdmin ||
            req.user?.associationRoles.some(
                (r: any) => r.associationId === targetAssoc.id && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
            );
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete from S3 bucket
        if (targetAssoc.logoUrl) {
            const key = extractS3KeyFromUrl(targetAssoc.logoUrl);
            if (key) {
                try {
                    await S3Service.deleteFile(key);
                    console.log(`[S3] Deleted association logo from bucket: ${key}`);
                } catch (delErr: any) {
                    console.warn(`[S3] Notice on deleting S3 file "${key}": ${delErr.message}`);
                }
            }
        }

        const updated = await prisma.association.update({
            where: { id: req.params.id },
            data: {
                logoUrl: null,
            },
        });

        await AuditService.record({
            req,
            action: 'ASSOCIATION_LOGO_DELETE',
            category: AuditCategory.GOVERNANCE,
            entityType: 'Association',
            entityId: updated.id,
            associationId: updated.id,
            description: `Deleted official logo for association "${updated.name}" (${updated.code})`,
            status: 'SUCCESS',
            metadata: {
                previousLogoUrl: targetAssoc.logoUrl,
            },
        });

        res.json({ success: true, association: updated });
    } catch (err: any) {
        next(err);
    }
});

// POST /associations/:id/seasons - Create Season
router.post('/:id/seasons', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;

        if (isCurrent) {
            await prisma.season.updateMany({
                where: { associationId: req.params.id },
                data: { isCurrent: false },
            });
        }

        const season = await prisma.season.create({
            data: {
                associationId: req.params.id,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isCurrent: !!isCurrent,
            },
        });

        res.status(201).json(season);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id/seasons - List seasons
router.get('/:id/seasons', async (req, res, next) => {
    try {
        const seasons = await prisma.season.findMany({
            where: { associationId: req.params.id },
            orderBy: { startDate: 'desc' },
        });
        res.json(seasons);
    } catch (err) {
        next(err);
    }
});

// PUT /associations/:id/seasons/:seasonId - Update Season
router.put('/:id/seasons/:seasonId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;

        if (isCurrent) {
            await prisma.season.updateMany({
                where: { associationId: req.params.id },
                data: { isCurrent: false },
            });
        }

        const season = await prisma.season.update({
            where: { id: req.params.seasonId },
            data: {
                ...(name ? { name } : {}),
                ...(startDate ? { startDate: new Date(startDate) } : {}),
                ...(endDate ? { endDate: new Date(endDate) } : {}),
                ...(isCurrent !== undefined ? { isCurrent: !!isCurrent } : {}),
            },
        });

        res.json(season);
    } catch (err) {
        next(err);
    }
});

// POST /associations/:id/seasons/:seasonId/set-current - Set Active Season
router.post('/:id/seasons/:seasonId/set-current', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        await prisma.season.updateMany({
            where: { associationId: req.params.id },
            data: { isCurrent: false },
        });

        const season = await prisma.season.update({
            where: { id: req.params.seasonId },
            data: { isCurrent: true },
        });

        await AuditService.record({
            req,
            action: 'SEASON_ACTIVATED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'Season',
            entityId: season.id,
            associationId: req.params.id,
            description: `Activated season "${season.name}" for association`,
            status: 'SUCCESS',
        });

        res.json(season);
    } catch (err) {
        next(err);
    }
});

// DELETE /associations/:id/seasons/:seasonId - Delete Season
router.delete('/:id/seasons/:seasonId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const season = await prisma.season.findUnique({
            where: { id: req.params.seasonId },
            include: { _count: { select: { licenses: true, competitions: true } } },
        });

        if (!season) {
            return res.status(404).json({ error: 'Season not found' });
        }

        if (season._count.licenses > 0 || season._count.competitions > 0) {
            return res.status(400).json({
                error: `Cannot delete season with active licenses (${season._count.licenses}) or competitions (${season._count.competitions}).`,
            });
        }

        await prisma.season.delete({
            where: { id: req.params.seasonId },
        });

        res.json({ message: 'Season deleted successfully', id: req.params.seasonId });
    } catch (err) {
        next(err);
    }
});

export default router;
