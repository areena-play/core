import { HttpClient } from '../client';

export class CompetitionsApi {
    constructor(private http: HttpClient) {}

    getCompetitions(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/competitions${qs ? `?${qs}` : ''}`);
    }

    getCompetition(id: string) {
        return this.http.request(`/competitions/${id}`);
    }

    getLiveEncounters() {
        return this.http.request('/competitions/live');
    }

    createCompetition(body: any) {
        return this.http.request('/competitions', { method: 'POST', body: JSON.stringify(body) });
    }

    createCompetitionCategory(competitionId: string, body: any) {
        return this.createCategory(competitionId, body);
    }

    createCategoryTeam(categoryId: string, body: any) {
        return this.registerTeam(categoryId, body);
    }

    generateCategoryGroups(categoryId: string, body: any) {
        return this.generateGroups(categoryId, body);
    }

    createCategory(competitionId: string, body: any) {
        return this.http.request(`/competitions/${competitionId}/categories`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    registerTeam(categoryId: string, body: any) {
        return this.http.request(`/competitions/categories/${categoryId}/teams`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    generateGroups(categoryId: string, body: any) {
        return this.http.request(`/competitions/categories/${categoryId}/generate-groups`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getEncounter(id: string) {
        return this.http.request(`/competitions/encounters/${id}`);
    }

    updateMatchScore(matchId: string, body: any) {
        return this.http.request(`/competitions/matches/${matchId}/score`, { method: 'PUT', body: JSON.stringify(body) });
    }

    updateCompetition(id: string, body: any) {
        return this.http.request(`/competitions/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    approveCompetition(id: string, body: any) {
        return this.http.request(`/competitions/${id}/approval`, { method: 'PUT', body: JSON.stringify(body) });
    }

    getCompetitionRoles(id: string) {
        return this.http.request(`/competitions/${id}/roles`);
    }

    assignCompetitionRole(id: string, body: any) {
        return this.http.request(`/competitions/${id}/roles`, { method: 'POST', body: JSON.stringify(body) });
    }

    revokeCompetitionRole(id: string, roleId: string) {
        return this.http.request(`/competitions/${id}/roles/${roleId}`, { method: 'DELETE' });
    }

    getCompetitionPlayers(id: string) {
        return this.http.request(`/competitions/${id}/players`);
    }

    checkinCompetitionPlayer(id: string, regId: string, body: any) {
        return this.http.request(`/competitions/${id}/players/${regId}/checkin`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateCompetitionPlayerPayment(id: string, regId: string, body: any) {
        return this.http.request(`/competitions/${id}/players/${regId}/payment`, { method: 'POST', body: JSON.stringify(body) });
    }

    getCompetitionSpeakerCallouts(id: string) {
        return this.http.request(`/competitions/${id}/speaker/callouts`);
    }

    createCompetitionSpeakerCallout(id: string, body: any) {
        return this.http.request(`/competitions/${id}/speaker/callouts`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateCompetitionSpeakerCallout(id: string, calloutId: string, body: any) {
        return this.http.request(`/competitions/${id}/speaker/callouts/${calloutId}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    getCompetitionStatistics(id: string) {
        return this.http.request(`/competitions/${id}/statistics`);
    }

    backupCompetition(id: string) {
        return this.http.request(`/competitions/${id}/backup`, { method: 'POST' });
    }

    getCompetitionActions(id: string) {
        return this.http.request(`/competitions/${id}/actions`);
    }
}

