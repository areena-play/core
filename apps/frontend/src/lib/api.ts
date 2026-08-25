const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('areena_token');
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // Auth
  login(body: any) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  }

  register(body: any) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  }

  getMe() {
    return this.request('/auth/me');
  }

  updateProfile(body: any) {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
  }

  getUsers(query: string = '') {
    return this.request(`/auth/users?q=${encodeURIComponent(query)}`);
  }

  // Associations & Hierarchy
  getAssociations() {
    return this.request('/associations');
  }

  getAssociation(id: string) {
    return this.request(`/associations/${id}`);
  }

  getAssociationRules(id: string) {
    return this.request(`/associations/${id}/rules`);
  }

  createAssociation(body: any) {
    return this.request('/associations', { method: 'POST', body: JSON.stringify(body) });
  }

  updateLicenseIdTemplate(associationId: string, body: any) {
    return this.request(`/associations/${associationId}/settings/license-template`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  createSeason(associationId: string, body: any) {
    return this.request(`/associations/${associationId}/seasons`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getSeasons(associationId: string) {
    return this.request(`/associations/${associationId}/seasons`);
  }

  // Clubs
  getClubs() {
    return this.request('/clubs');
  }

  getClub(id: string) {
    return this.request(`/clubs/${id}`);
  }

  createClub(body: any) {
    return this.request('/clubs', { method: 'POST', body: JSON.stringify(body) });
  }

  // Licenses
  getLicenses(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/licenses${qs ? `?${qs}` : ''}`);
  }

  applyLicense(body: any) {
    return this.request('/licenses/apply', { method: 'POST', body: JSON.stringify(body) });
  }

  approveLicense(licenseId: string, body: any) {
    return this.request(`/licenses/${licenseId}/approval`, { method: 'POST', body: JSON.stringify(body) });
  }

  updateUserLicenseId(userId: string, licenseId: string) {
    return this.request(`/licenses/user/${userId}/license-id`, {
      method: 'PUT',
      body: JSON.stringify({ licenseId }),
    });
  }

  getRefresherCourses() {
    return this.request('/licenses/courses');
  }

  createRefresherCourse(body: any) {
    return this.request('/licenses/courses', { method: 'POST', body: JSON.stringify(body) });
  }

  attestCourseAttendance(courseId: string, body: any) {
    return this.request(`/licenses/courses/${courseId}/attest`, { method: 'POST', body: JSON.stringify(body) });
  }

  // Competitions (Leagues & Tournaments)
  getCompetitions(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/competitions${qs ? `?${qs}` : ''}`);
  }

  getCompetition(id: string) {
    return this.request(`/competitions/${id}`);
  }

  getLiveEncounters() {
    return this.request('/competitions/live');
  }

  createCompetition(body: any) {
    return this.request('/competitions', { method: 'POST', body: JSON.stringify(body) });
  }

  createCategory(competitionId: string, body: any) {
    return this.request(`/competitions/${competitionId}/categories`, { method: 'POST', body: JSON.stringify(body) });
  }

  registerTeam(categoryId: string, body: any) {
    return this.request(`/competitions/categories/${categoryId}/teams`, { method: 'POST', body: JSON.stringify(body) });
  }

  generateGroups(categoryId: string, body: any) {
    return this.request(`/competitions/categories/${categoryId}/generate-groups`, { method: 'POST', body: JSON.stringify(body) });
  }

  getEncounter(id: string) {
    return this.request(`/competitions/encounters/${id}`);
  }

  updateMatchScore(matchId: string, body: any) {
    return this.request(`/competitions/matches/${matchId}/score`, { method: 'PUT', body: JSON.stringify(body) });
  }

  // Calendar
  getCalendarEvents(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/calendar${qs ? `?${qs}` : ''}`);
  }

  createCalendarEvent(body: any) {
    return this.request('/calendar', { method: 'POST', body: JSON.stringify(body) });
  }

  // Communications
  sendBroadcast(body: any) {
    return this.request('/messages/broadcast', { method: 'POST', body: JSON.stringify(body) });
  }

  getMessages() {
    return this.request('/messages');
  }

  // OAuth / Developer Portal
  getOAuthClients() {
    return this.request('/oauth/clients');
  }

  createOAuthClient(body: any) {
    return this.request('/oauth/clients', { method: 'POST', body: JSON.stringify(body) });
  }

  approveOAuthClient(clientId: string, body: any) {
    return this.request(`/oauth/clients/${clientId}/approve`, { method: 'POST', body: JSON.stringify(body) });
  }

  requestOAuthToken(body: any) {
    return this.request('/oauth/token', { method: 'POST', body: JSON.stringify(body) });
  }

  // Protected OAuth API Tester
  fetchOAuthApi(endpoint: string, token: string) {
    return fetch(`${API_BASE}/oauth${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());
  }
}

export const api = new ApiClient();

