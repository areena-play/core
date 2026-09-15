import { SystemService } from './system.service';

export interface TtsSynthesisResult {
    audioBase64: string;
    mimeType: string;
    spokenText: string;
    languageCode: string;
    voiceName: string;
}

export class GoogleTtsService {
    /**
     * Synthesize plain text or SSML using Google Cloud Text-to-Speech API
     */
    public static async synthesizeSpeech(
        text: string,
        options?: {
            isSsml?: boolean;
            languageCode?: string;
            voiceName?: string;
            speakingRate?: number;
            pitch?: number;
        }
    ): Promise<TtsSynthesisResult> {
        const config = await SystemService.getGoogleTtsConfig();

        if (!config.enabled) {
            throw new Error('Google Text-to-Speech integration is disabled in system settings.');
        }

        if (!config.apiKey) {
            throw new Error('Google Text-to-Speech API key is not configured in system settings.');
        }

        const languageCode = options?.languageCode || config.languageCode || 'de-CH';
        const voiceName = options?.voiceName || config.voiceName || 'de-CH-Wavenet-A';
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(config.apiKey)}`;

        const body: any = {
            input: options?.isSsml ? { ssml: text } : { text },
            voice: {
                languageCode,
                name: voiceName,
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: options?.speakingRate || 1.0,
                pitch: options?.pitch || 0.0,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorJson = (await response.json()) as any;
                errorDetails = errorJson?.error?.message || JSON.stringify(errorJson);
            } catch {
                errorDetails = await response.text();
            }
            throw new Error(`Google TTS API Error (${response.status}): ${errorDetails}`);
        }

        const data = (await response.json()) as any;
        const audioContent = data.audioContent; // base64 encoded MP3

        if (!audioContent) {
            throw new Error('Google TTS did not return audio content.');
        }

        return {
            audioBase64: audioContent,
            mimeType: 'audio/mp3',
            spokenText: text,
            languageCode,
            voiceName,
        };
    }

    /**
     * Test Google Cloud TTS connection and return audio sample
     */
    public static async testConnection(): Promise<{
        success: boolean;
        languageCode: string;
        voiceName: string;
        audioBase64?: string;
        error?: string;
    }> {
        try {
            const config = await SystemService.getGoogleTtsConfig();
            if (!config.apiKey) {
                return {
                    success: false,
                    languageCode: config.languageCode || 'de-CH',
                    voiceName: config.voiceName || 'de-CH-Wavenet-A',
                    error: 'Google TTS API Key is not set.',
                };
            }

            const testPhrase = 'AREENA Sport System. Text to Speech online.';
            const result = await this.synthesizeSpeech(testPhrase);

            return {
                success: true,
                languageCode: result.languageCode,
                voiceName: result.voiceName,
                audioBase64: result.audioBase64,
            };
        } catch (err: any) {
            return {
                success: false,
                languageCode: 'unknown',
                voiceName: 'unknown',
                error: err.message || 'Failed to connect to Google Cloud Text-to-Speech API.',
            };
        }
    }

    /**
     * Synthesize an athlete's name pronunciation preview
     */
    public static async synthesizeAthletePronunciation(
        firstName: string,
        lastName: string,
        phoneticFirstName?: string | null,
        phoneticLastName?: string | null,
        languageCode?: string
    ): Promise<TtsSynthesisResult> {
        const spokenFirst = (phoneticFirstName || '').trim() || firstName;
        const spokenLast = (phoneticLastName || '').trim() || lastName;
        const spokenText = `${spokenFirst} ${spokenLast}`.trim();

        return this.synthesizeSpeech(spokenText, {
            languageCode,
            speakingRate: 0.95, // Slightly slower for clear pronunciation check
        });
    }

    /**
     * Synthesize a tournament table callout announcement
     */
    public static async synthesizeMatchCallout(
        tableNumber: number | string,
        homePlayerName: string,
        awayPlayerName: string,
        competitionTitle?: string,
        languageCode?: string
    ): Promise<TtsSynthesisResult> {
        const announcementText = `Nächstes Spiel auf Tisch ${tableNumber}: ${homePlayerName} gegen ${awayPlayerName}.`;
        return this.synthesizeSpeech(announcementText, {
            languageCode,
            speakingRate: 1.0,
        });
    }
}
