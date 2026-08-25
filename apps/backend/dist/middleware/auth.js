"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.optionalAuth = optionalAuth;
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireAssociationAdmin = requireAssociationAdmin;
exports.requireClubAdmin = requireClubAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                associationRoles: true,
                clubRoles: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found or token invalid' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isSuperAdmin: user.isSuperAdmin,
            licenseId: user.licenseId,
            associationRoles: user.associationRoles.map((r) => ({ associationId: r.associationId, role: r.role })),
            clubRoles: user.clubRoles.map((r) => ({ clubId: r.clubId, role: r.role })),
        };
        next();
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        prisma_1.prisma.user
            .findUnique({
            where: { id: payload.userId },
            include: { associationRoles: true, clubRoles: true },
        })
            .then((user) => {
            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isSuperAdmin: user.isSuperAdmin,
                    licenseId: user.licenseId,
                    associationRoles: user.associationRoles.map((r) => ({ associationId: r.associationId, role: r.role })),
                    clubRoles: user.clubRoles.map((r) => ({ clubId: r.clubId, role: r.role })),
                };
            }
            next();
        })
            .catch(() => next());
    }
    catch {
        next();
    }
}
function requireSuperAdmin(req, res, next) {
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Super Admin access required' });
    }
    next();
}
function requireAssociationAdmin(associationIdParamKey = 'associationId') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        const targetAssocId = req.params[associationIdParamKey] || req.body[associationIdParamKey];
        const hasRole = req.user.associationRoles.some((r) => r.associationId === targetAssocId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));
        if (!hasRole) {
            return res.status(403).json({ error: 'Association Admin permissions required' });
        }
        next();
    };
}
function requireClubAdmin(clubIdParamKey = 'clubId') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        const targetClubId = req.params[clubIdParamKey] || req.body[clubIdParamKey];
        const hasRole = req.user.clubRoles.some((r) => r.clubId === targetClubId && ['ADMIN', 'PRESIDENT', 'MANAGER'].includes(r.role));
        if (!hasRole) {
            return res.status(403).json({ error: 'Club Admin permissions required' });
        }
        next();
    };
}
