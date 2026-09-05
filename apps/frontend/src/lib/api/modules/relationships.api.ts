import { HttpClient } from '../client';

export interface ManagedPlayer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    licenseId?: string | null;
    eloPoints: number;
    accountStatus: 'MANAGED' | 'INVITED' | 'ACTIVE';
    canLogin: boolean;
    avatarUrl?: string | null;
    licenses?: any[];
    clubRoles?: any[];
}

export interface ManagedProfileItem {
    relationshipId: string;
    relationshipType: 'PARENT_GUARDIAN' | 'CLUB_COACH' | 'TEAM_CAPTAIN' | 'DELEGATED_COMPANION';
    permission: 'FULL_MANAGEMENT' | 'TOURNAMENT_ONLY' | 'VIEW_AND_ALERTS_ONLY';
    isEmergencyContact: boolean;
    emergencyPhone?: string | null;
    player: ManagedPlayer;
}

export interface CreateDependentPayload {
    firstName: string;
    lastName: string;
    birthDate?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    clubId?: string;
    emergencyPhone?: string;
    relationshipType?: string;
    permission?: string;
}

export interface AddCoGuardianPayload {
    managedUserId: string;
    coGuardianIdentifier: string;
    type?: string;
    permission?: string;
    emergencyPhone?: string;
}

export class RelationshipsApi {
    constructor(private http: HttpClient) {}

    getManagedProfiles(): Promise<{ success: boolean; count: number; profiles: ManagedProfileItem[] }> {
        return this.http.request('/relationships/managed');
    }

    getGuardians(userId: string): Promise<{ success: boolean; guardians: any[] }> {
        return this.http.request(`/relationships/guardians/${userId}`);
    }

    createDependent(payload: CreateDependentPayload): Promise<{ success: boolean; player: any; relationship: any }> {
        return this.http.request('/relationships/dependent', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    addCoGuardian(payload: AddCoGuardianPayload): Promise<{ success: boolean; relationship: any }> {
        return this.http.request('/relationships/co-guardian', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    createClaimInvite(userId: string): Promise<{ success: boolean; invite: { claimToken: string; claimUrl: string; expiresAt: string; player: any } }> {
        return this.http.request(`/relationships/invite-claim/${userId}`, {
            method: 'POST',
        });
    }

    claimAccount(payload: { claimToken: string; email: string; password: string }): Promise<{ success: boolean; message: string; user: any }> {
        return this.http.request('/relationships/claim', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    removeRelationship(id: string): Promise<{ success: boolean }> {
        return this.http.request(`/relationships/${id}`, {
            method: 'DELETE',
        });
    }

    quickAddClubMember(clubId: string, payload: CreateDependentPayload): Promise<{ success: boolean; player: any; relationship: any }> {
        return this.http.request(`/clubs/${clubId}/members/quick-add`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
}
