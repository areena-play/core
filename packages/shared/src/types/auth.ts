import { Gender } from './common';

export enum OAuthClientStatus {
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REVOKED = 'REVOKED',
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    birthDate?: string | null;
    gender?: Gender | null;
    licenseId?: string | null;
    eloPoints: number;
    rank?: number | null;
    avatarUrl?: string | null;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    isPubliclyHidden?: boolean;
    displayNameChoice?: 'FULL_NAME' | 'INITIALS' | 'ANONYMOUS';
    hideEloRanking?: boolean;
    hideContactInfo?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AdminUserListItem extends UserProfile {
    associationRoles: {
        id: string;
        role: string;
        association: { id: string; name: string; shortName: string; code: string };
    }[];
    clubRoles: {
        id: string;
        role: string;
        club: { id: string; name: string; code: string };
    }[];
    licenses: {
        id: string;
        type: string;
        status: string;
        validUntil: string;
        club: { id: string; name: string };
    }[];
}

export interface AdminUserListResponse {
    users: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
        totalUsers: number;
        superAdmins: number;
        verifiedUsers: number;
        unverifiedUsers: number;
    };
}

export interface AdminUserFilterParams {
    q?: string;
    role?: 'ALL' | 'SUPER_ADMIN' | 'FEDERATION' | 'CLUB' | 'ATHLETE' | 'UNVERIFIED';
    page?: number;
    limit?: number;
    sortBy?: 'lastName' | 'createdAt' | 'email' | 'eloPoints';
    sortDir?: 'asc' | 'desc';
}

export interface AdminResetPasswordResponse {
    message: string;
    temporaryPassword?: string;
}

