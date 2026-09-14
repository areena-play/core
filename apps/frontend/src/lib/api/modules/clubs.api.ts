import { HttpClient } from '../client';

export class ClubsApi {
    constructor(private http: HttpClient) {}

    getClubs() {
        return this.http.request('/clubs');
    }

    getClub(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}`);
    }

    getClubContacts(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/contacts`);
    }

    getClubMembers(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/members`);
    }

    getClubTeams(idOrSlug: string, params?: { seasonId?: string; type?: string }) {
        const query = new URLSearchParams();
        if (params?.seasonId) query.set('seasonId', params.seasonId);
        if (params?.type) query.set('type', params.type);
        const qs = query.toString();
        return this.http.request(`/clubs/${idOrSlug}/teams${qs ? `?${qs}` : ''}`);
    }

    getClubTeamHub(idOrSlug: string, params?: { seasonId?: string; type?: string }) {
        const query = new URLSearchParams();
        if (params?.seasonId) query.set('seasonId', params.seasonId);
        if (params?.type) query.set('type', params.type);
        const qs = query.toString();
        return this.http.request(`/clubs/${idOrSlug}/team-hub${qs ? `?${qs}` : ''}`);
    }

    registerClubTeam(idOrSlug: string, body: { categoryId: string; teamName: string; playerUserIds?: string[]; captainUserId?: string }) {
        return this.http.request(`/clubs/${idOrSlug}/teams`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    updateClubTeam(idOrSlug: string, teamId: string, body: { name?: string; playerUserIds?: string[]; captainUserId?: string }) {
        return this.http.request(`/clubs/${idOrSlug}/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    withdrawClubTeam(idOrSlug: string, teamId: string) {
        return this.http.request(`/clubs/${idOrSlug}/teams/${teamId}`, {
            method: 'DELETE',
        });
    }

    submitClubTeamLeagueDecision(idOrSlug: string, teamId: string, body: { decision: string; notes?: string }) {
        return this.http.request(`/clubs/${idOrSlug}/teams/${teamId}/league-decision`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getClubTournaments(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/tournaments`);
    }

    createClubTournament(idOrSlug: string, body: any) {
        return this.http.request(`/clubs/${idOrSlug}/tournaments`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getClubEvents(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/events`);
    }

    getClubLicensing(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/licensing`);
    }

    applyClubLicenseOnBehalf(idOrSlug: string, body: { userId: string; type: string; seasonId?: string; notes?: string }) {
        return this.http.request(`/clubs/${idOrSlug}/licenses/apply-behalf`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    approveClubLicense(idOrSlug: string, licenseId: string) {
        return this.http.request(`/clubs/${idOrSlug}/licenses/${licenseId}/club-approve`, {
            method: 'POST',
        });
    }

    rejectClubLicense(idOrSlug: string, licenseId: string, reason?: string) {
        return this.http.request(`/clubs/${idOrSlug}/licenses/${licenseId}/club-reject`, {
            method: 'POST',
            body: reason ? JSON.stringify({ reason }) : undefined,
        });
    }

    getClubMembersHub(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/members-hub`);
    }

    registerClubMember(idOrSlug: string, body: any) {
        return this.http.request(`/clubs/${idOrSlug}/members/register`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    grantClubRole(idOrSlug: string, body: { userId: string; role: string; title?: string }) {
        return this.http.request(`/clubs/${idOrSlug}/roles`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    revokeClubRole(idOrSlug: string, roleId: string) {
        return this.http.request(`/clubs/${idOrSlug}/roles/${roleId}`, {
            method: 'DELETE',
        });
    }

    getClubCommunications(idOrSlug: string) {
        return this.http.request(`/clubs/${idOrSlug}/communications`);
    }

    sendClubCommunication(
        idOrSlug: string,
        body: {
            title?: string;
            subject?: string;
            content?: string;
            body?: string;
            targetAudience?: string;
            targetGroup?: string;
            channel?: string;
            priority?: string;
        }
    ) {
        return this.http.request(`/clubs/${idOrSlug}/communications`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    createClub(body: any) {
        return this.http.request('/clubs', { method: 'POST', body: JSON.stringify(body) });
    }

    updateClub(idOrSlug: string, body: any) {
        return this.http.request(`/clubs/${idOrSlug}`, { method: 'PUT', body: JSON.stringify(body) });
    }
}

