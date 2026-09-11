import { HttpClient } from '../client';

export class LicensesApi {
    constructor(private http: HttpClient) {}

    getLicenses(params: Record<string, string | number> = {}) {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                qs.set(k, String(v));
            }
        });
        const query = qs.toString();
        return this.http.request(`/licenses${query ? `?${query}` : ''}`);
    }

    getLicenseStats(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request<any>(`/licenses/stats${qs ? `?${qs}` : ''}`);
    }

    applyLicense(body: any) {
        return this.http.request('/licenses/apply', { method: 'POST', body: JSON.stringify(body) });
    }

    approveLicense(licenseId: string, body: any) {
        return this.http.request(`/licenses/${licenseId}/approval`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateUserLicenseId(userId: string, licenseId: string) {
        return this.http.request(`/licenses/user/${userId}/license-id`, {
            method: 'PUT',
            body: JSON.stringify({ licenseId }),
        });
    }

    getRefresherCourses() {
        return this.http.request('/licenses/courses');
    }

    createRefresherCourse(body: any) {
        return this.http.request('/licenses/courses', { method: 'POST', body: JSON.stringify(body) });
    }

    attestCourseAttendance(courseId: string, body: any) {
        return this.http.request(`/licenses/courses/${courseId}/attest`, { method: 'POST', body: JSON.stringify(body) });
    }
}

