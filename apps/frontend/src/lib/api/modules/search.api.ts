import { HttpClient } from '../client';

export interface GlobalSearchResult {
    type: 'person' | 'club' | 'competition' | 'association' | 'page';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    badge?: string;
    avatarUrl?: string;
}

export interface GlobalSearchResponse {
    results: GlobalSearchResult[];
}

export class SearchApi {
    constructor(private http: HttpClient) {}

    searchGlobal(query: string): Promise<GlobalSearchResponse> {
        return this.http.request(`/search/global?q=${encodeURIComponent(query)}`);
    }
}

