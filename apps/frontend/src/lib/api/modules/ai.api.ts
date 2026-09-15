import { HttpClient } from '../client';

export interface MatchAnalysisResponse {
    success: boolean;
    matchId: string;
    analysis: {
        summaryMarkdown: string;
        tacticalInsights: {
            strengths: string[];
            areasToImprove: string[];
            momentumShifts: string[];
        };
        rawText: string;
        modelUsed: string;
    };
}

export interface PhoneticSuggestionResponse {
    success: boolean;
    suggestion: {
        phoneticFirstName: string;
        phoneticLastName: string;
        explanation?: string;
    };
}

export interface PhoneticValidationResponse {
    isValid: boolean;
    reason?: string;
    suggestedAlternative?: {
        phoneticFirstName: string;
        phoneticLastName: string;
        explanation?: string;
    };
}

export class AiApi {
    constructor(private http: HttpClient) {}

    getMatchAnalysis(matchId: string): Promise<MatchAnalysisResponse> {
        return this.http.request(`/ai/match-analysis/${matchId}`, {
            method: 'POST',
        });
    }

    suggestPhonetics(body: { firstName?: string; lastName?: string; languageHint?: string }): Promise<PhoneticSuggestionResponse> {
        return this.http.request('/ai/suggest-phonetics', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    validatePhonetics(body: {
        realFirstName?: string;
        realLastName?: string;
        phoneticFirstName?: string | null;
        phoneticLastName?: string | null;
    }): Promise<PhoneticValidationResponse> {
        return this.http.request('/ai/validate-phonetics', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

