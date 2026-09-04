import { HttpClient } from '../client';

export class LocationsApi {
    constructor(private http: HttpClient) {}

    getLocations(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/locations${qs ? `?${qs}` : ''}`);
    }

    getLocation(idOrSlug: string) {
        return this.http.request(`/locations/${idOrSlug}`);
    }

    createLocation(body: any) {
        return this.http.request('/locations', { method: 'POST', body: JSON.stringify(body) });
    }

    updateLocation(id: string, body: any) {
        return this.http.request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteLocation(id: string) {
        return this.http.request(`/locations/${id}`, { method: 'DELETE' });
    }

    createLocationUnit(locationId: string, body: any) {
        return this.http.request(`/locations/${locationId}/units`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateLocationUnit(locationId: string, unitId: string, body: any) {
        return this.http.request(`/locations/${locationId}/units/${unitId}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteLocationUnit(locationId: string, unitId: string) {
        return this.http.request(`/locations/${locationId}/units/${unitId}`, { method: 'DELETE' });
    }

    getLocationReservations(locationId: string, params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/locations/${locationId}/reservations${qs ? `?${qs}` : ''}`);
    }

    createLocationReservation(locationId: string, body: any) {
        return this.http.request(`/locations/${locationId}/reservations`, { method: 'POST', body: JSON.stringify(body) });
    }

    deleteLocationReservation(locationId: string, resId: string) {
        return this.http.request(`/locations/${locationId}/reservations/${resId}`, { method: 'DELETE' });
    }
}

