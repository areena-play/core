import { HttpClient, API_BASE } from '../client';

export class AssociationsApi {
    constructor(private http: HttpClient) {}

    getTopAssociation() {
        return this.http.request('/associations?top=true');
    }

    getAssociations() {
        return this.http.request('/associations');
    }

    getAssociation(id: string) {
        return this.http.request(`/associations/${id}`);
    }

    getAssociationRules(id: string) {
        return this.http.request(`/associations/${id}/rules`);
    }

    createAssociation(body: any) {
        return this.http.request('/associations', { method: 'POST', body: JSON.stringify(body) });
    }

    updateAssociationSettings(associationId: string, body: any) {
        return this.http.request(`/associations/${associationId}/settings`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    uploadAssociationLogo(associationId: string, file: File) {
        const formData = new FormData();
        formData.append('logo', file);
        const token = typeof window !== 'undefined' ? localStorage.getItem('areena_token') : null;
        return fetch(`${API_BASE}/associations/${associationId}/logo`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Logo upload failed with status ${res.status}`);
            }
            return res.json();
        });
    }

    deleteAssociationLogo(associationId: string) {
        return this.http.request(`/associations/${associationId}/logo`, {
            method: 'DELETE',
        });
    }

    updateLicenseIdTemplate(associationId: string, body: any) {
        return this.http.request(`/associations/${associationId}/settings/license-template`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    createSeason(associationId: string, body: any) {
        return this.http.request(`/associations/${associationId}/seasons`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getSeasons(associationId: string) {
        return this.http.request(`/associations/${associationId}/seasons`);
    }

    updateSeason(associationId: string, seasonId: string, body: any) {
        return this.http.request(`/associations/${associationId}/seasons/${seasonId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    setCurrentSeason(associationId: string, seasonId: string) {
        return this.http.request(`/associations/${associationId}/seasons/${seasonId}/set-current`, {
            method: 'POST',
        });
    }

    deleteSeason(associationId: string, seasonId: string) {
        return this.http.request(`/associations/${associationId}/seasons/${seasonId}`, {
            method: 'DELETE',
        });
    }
}

