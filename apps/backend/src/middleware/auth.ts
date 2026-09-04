import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
    licenseId?: string | null;
    associationRoles: Array<{ associationId: string; role: string }>;
    clubRoles: Array<{ clubId: string; role: string }>;
}

export interface AuthRequest extends Request {
    user?: AuthenticatedUser;
    isOAuth?: boolean;
    isFrontend?: boolean;
    oauth?: {
        clientId: string;
        userId?: string | null;
        scopes: string[];
    };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    // 1. OAuth Request: Enforce mutating scope boundaries
    if (req.isOAuth && req.oauth) {
        const method = req.method.toUpperCase();
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const hasAdminScope = req.oauth.scopes.includes('*') || req.oauth.scopes.includes('admin:*');
            const hasWriteScope = hasAdminScope || req.oauth.scopes.some((s: string) => s.startsWith('write:') || s.endsWith(':*'));
            if (!hasWriteScope) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Insufficient OAuth scope. Token only has read scopes (${req.oauth.scopes.join(', ')}) and cannot perform mutating ${method} requests.`,
                    grantedScopes: req.oauth.scopes,
                });
            }
        }
        return next();
    }

    // 2. Authenticated User Session (verified by Ingress Guard)
    if (req.user) {
        return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    // req.user and req.oauth are already populated by Ingress Guard if authenticated
    next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Super Admin access required' });
    }
    next();
}

export function requireAssociationAdmin(associationIdParamKey: string = 'associationId') {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        const targetAssocId = req.params[associationIdParamKey] || req.body[associationIdParamKey];
        const hasRole = req.user.associationRoles.some(
            (r) => r.associationId === targetAssocId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );
        if (!hasRole) {
            return res.status(403).json({ error: 'Association Admin permissions required' });
        }
        next();
    };
}

export function requireClubAdmin(clubIdParamKey: string = 'clubId') {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        const targetClubId = req.params[clubIdParamKey] || req.body[clubIdParamKey];
        const hasRole = req.user.clubRoles.some(
            (r) => r.clubId === targetClubId && ['ADMIN', 'PRESIDENT', 'MANAGER'].includes(r.role),
        );
        if (!hasRole) {
            return res.status(403).json({ error: 'Club Admin permissions required' });
        }
        next();
    };
}
