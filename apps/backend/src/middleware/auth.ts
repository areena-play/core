import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';

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
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({
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
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    prisma.user
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
  } catch {
    next();
  }
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
      (r) => r.associationId === targetAssocId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role)
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
      (r) => r.clubId === targetClubId && ['ADMIN', 'PRESIDENT', 'MANAGER'].includes(r.role)
    );
    if (!hasRole) {
      return res.status(403).json({ error: 'Club Admin permissions required' });
    }
    next();
  };
}

