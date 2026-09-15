import { HttpClient } from '../client';

export interface TtsPreviewResponse {
    success: boolean;
    audioBase64: string;
    mimeType: string;
    spokenText: string;
    voiceName?: string;
}

export interface TtsAnnouncementResponse {
    success: boolean;
    audioBase64: string;
    mimeType: string;
    spokenText: string;
}

export class TtsApi {
    constructor(private http: HttpClient) {}

    previewPronunciation(body?: {
        phoneticFirstName?: string | null;
        phoneticLastName?: string | null;
    }): Promise<TtsPreviewResponse> {
        return this.http.request('/tts/preview', {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    synthesizeAnnouncement(body: {
        tableNumber?: number | string;
        homePlayerName?: string;
        awayPlayerName?: string;
        text?: string;
        competitionTitle?: string;
        languageCode?: string;
    }): Promise<TtsAnnouncementResponse> {
        return this.http.request('/tts/synthesize-announcement', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

