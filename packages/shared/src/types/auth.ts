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
    createdAt: string;
    updatedAt: string;
}

