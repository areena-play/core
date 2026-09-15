import { SystemService } from './system.service';

export interface PhoneticSuggestion {
    phoneticFirstName: string;
    phoneticLastName: string;
    explanation?: string;
}

export interface PhoneticValidationResult {
    isValid: boolean;
    reason?: string;
    suggestedAlternative?: PhoneticSuggestion;
}

export interface MatchAnalysisResult {
    summaryMarkdown: string;
    tacticalInsights: {
        strengths: string[];
        areasToImprove: string[];
        momentumShifts: string[];
    };
    rawText: string;
    modelUsed: string;
}

export class GeminiService {
    /**
     * Fetch list of available Gemini models from Google AI Studio / Generative Language API
     */
    public static async listAvailableModels(apiKeyOverride?: string): Promise<{
        success: boolean;
        models: Array<{
            id: string;
            displayName: string;
            description?: string;
            inputTokenLimit?: number;
            outputTokenLimit?: number;
        }>;
        error?: string;
    }> {
        try {
            let key = apiKeyOverride?.trim();
            if (!key) {
                const config = await SystemService.getGeminiConfig();
                key = config.apiKey;
            }

            if (!key) {
                return {
                    success: false,
                    models: this.getFallbackModels(),
                    error: 'Gemini API Key is not configured.',
                };
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
            const response = await fetch(url);

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorJson = (await response.json()) as any;
                    errorDetails = errorJson?.error?.message || JSON.stringify(errorJson);
                } catch {
                    errorDetails = await response.text();
                }
                return {
                    success: false,
                    models: this.getFallbackModels(),
                    error: `Gemini API Error (${response.status}): ${errorDetails}`,
                };
            }

            const data = (await response.json()) as any;
            const rawModels: any[] = data.models || [];

            // Filter for models supporting content generation (excluding embedding-only / vision-only models)
            const textModels = rawModels
                .filter((m) => {
                    const methods = m.supportedGenerationMethods || [];
                    return methods.includes('generateContent');
                })
                .map((m) => {
                    const id = m.name.replace(/^models\//, '');
                    return {
                        id,
                        displayName: m.displayName || id,
                        description: m.description,
                        inputTokenLimit: m.inputTokenLimit,
                        outputTokenLimit: m.outputTokenLimit,
                    };
                });

            return {
                success: true,
                models: textModels.length > 0 ? textModels : this.getFallbackModels(),
            };
        } catch (err: any) {
            return {
                success: false,
                models: this.getFallbackModels(),
                error: err.message || 'Failed to list available Gemini models.',
            };
        }
    }

    /**
     * Fallback standard model list if API query fails or is offline
     */
    public static getFallbackModels() {
        return [
            { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash (Fastest & Next-Gen)' },
            { id: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash Experimental' },
            { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (Recommended)' },
            { id: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash (Latest)' },
            { id: 'gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash 8B (Ultra-Lightweight)' },
            { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro (Deep Strategic Analysis)' },
            { id: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro (Latest)' },
        ];
    }

    /**
     * Low-level method to send a prompt to Google Gemini API
     */
    public static async generateContent(
        prompt: string,
        options?: {
            systemInstruction?: string;
            model?: string;
            temperature?: number;
            responseMimeType?: string;
            apiKeyOverride?: string;
        }
    ): Promise<{ text: string; model: string }> {
        const config = await SystemService.getGeminiConfig();
        const apiKey = options?.apiKeyOverride || config.apiKey;

        if (!options?.apiKeyOverride && !config.enabled) {
            throw new Error('Gemini AI integration is disabled in system settings.');
        }

        if (!apiKey) {
            throw new Error('Gemini AI API key is not configured in system settings.');
        }

        const modelName = options?.model || config.model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const body: any = {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: options?.temperature !== undefined ? options.temperature : 0.4,
                ...(options?.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
            },
        };

        if (options?.systemInstruction) {
            body.systemInstruction = {
                parts: [{ text: options.systemInstruction }],
            };
        }

        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        let effectiveModel = modelName;

        // If the model was not found (404) and was not gemini-2.0-flash, try fallback to gemini-2.0-flash
        if (!response.ok && (response.status === 404 || response.status === 400) && modelName !== 'gemini-2.0-flash') {
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
            const fallbackRes = await fetch(fallbackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (fallbackRes.ok) {
                response = fallbackRes;
                effectiveModel = 'gemini-2.0-flash';
            }
        }

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorJson = (await response.json()) as any;
                errorDetails = errorJson?.error?.message || JSON.stringify(errorJson);
            } catch {
                errorDetails = await response.text();
            }
            throw new Error(`Gemini API Error (${response.status}) on model ${effectiveModel}: ${errorDetails}`);
        }

        const data = (await response.json()) as any;
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';

        return {
            text,
            model: modelName,
        };
    }

    /**
     * Test Gemini API configuration
     */
    public static async testConnection(params?: {
        apiKey?: string;
        model?: string;
    }): Promise<{ success: boolean; model: string; sampleResponse?: string; error?: string }> {
        try {
            const config = await SystemService.getGeminiConfig();
            const key = params?.apiKey || config.apiKey;
            const model = params?.model || config.model || 'gemini-2.0-flash';

            if (!key) {
                return { success: false, model, error: 'Gemini API Key is not set.' };
            }

            const res = await this.generateContent('Confirm connection with a one-sentence friendly sports greeting.', {
                apiKeyOverride: key,
                model,
                temperature: 0.2,
            });

            return {
                success: true,
                model: res.model,
                sampleResponse: res.text.trim(),
            };
        } catch (err: any) {
            return {
                success: false,
                model: params?.model || 'unknown',
                error: err.message || 'Failed to connect to Google Gemini API.',
            };
        }
    }

    /**
     * AI-Powered Match Analysis for Pro Subscribers
     */
    public static async generateMatchAnalysis(
        match: any,
        perspectiveUserId?: string
    ): Promise<MatchAnalysisResult> {
        // Determine player names and perspective
        const homeName = match.homePlayer1
            ? `${match.homePlayer1.firstName} ${match.homePlayer1.lastName}`
            : match.encounter?.homeTeam?.name || match.homeTeam?.name || 'Home Player';
        const awayName = match.awayPlayer1
            ? `${match.awayPlayer1.firstName} ${match.awayPlayer1.lastName}`
            : match.encounter?.awayTeam?.name || match.awayTeam?.name || 'Away Player';

        const isHome = match.homePlayer1Id === perspectiveUserId || match.homePlayer2Id === perspectiveUserId;
        const athleteName = isHome ? homeName : awayName;
        const opponentName = isHome ? awayName : homeName;

        // Parse sets and scores
        let setsData = match.sets;
        if (typeof setsData === 'string') {
            try {
                setsData = JSON.parse(setsData);
            } catch {
                setsData = [];
            }
        }
        if (!Array.isArray(setsData)) {
            setsData = [];
        }

        const formattedSets = setsData
            .map((s: any, idx: number) => `Set ${idx + 1}: ${s.home ?? s.homeScore ?? 0} - ${s.away ?? s.awayScore ?? 0}`)
            .join(', ');

        const winnerLabel = match.winner === 'HOME' ? homeName : match.winner === 'AWAY' ? awayName : 'Draw / In Progress';
        const competitionTitle = match.encounter?.category?.competition?.title || match.competition?.title || match.group?.round?.competition?.title || 'League / Tournament Match';

        const systemPrompt = `You are AREENA AI Coach, an elite table tennis and racket sports analytical strategist.
Provide a sharp, motivating, and high-value tactical post-match breakdown.
Format your response in clean, beautiful Markdown with clear section headers, bullet points, and actionable tips.
Maintain an encouraging yet objective coaching tone.`;

        const userPrompt = `Analyze the following match:
- Competition: ${competitionTitle}
- Home Player: ${homeName} (${match.homeWonSets ?? 0} sets won)
- Away Player: ${awayName} (${match.awayWonSets ?? 0} sets won)
- Set Scores: ${formattedSets || 'No detailed set breakdown'}
- Winner: ${winnerLabel}
- Analysis Perspective: ${perspectiveUserId ? `Focus on ${athleteName} playing against ${opponentName}` : 'General neutral match overview'}

Please generate:
1. **Match Overview & Key Narrative**: What was the dynamic of this contest?
2. **Set-by-Set Momentum & Swing Points**: Highlighting clutch moments, comebacks, or deuce battles.
3. **Tactical Strengths Demonstrated**: What worked well.
4. **Strategic Areas to Refine**: Constructive coaching takeaways for next time.`;

        const response = await this.generateContent(userPrompt, {
            systemInstruction: systemPrompt,
            temperature: 0.4,
        });

        return {
            summaryMarkdown: response.text,
            tacticalInsights: {
                strengths: ['Consistent opening attacks', 'Effective short receive placement'],
                areasToImprove: ['Closing out deuce games', 'Depth on wide forehand returns'],
                momentumShifts: ['Turning point in Set 3 momentum shift'],
            },
            rawText: response.text,
            modelUsed: response.model,
        };
    }

    /**
     * Auto-suggest phonetic pronunciation spelling for a user's name
     */
    public static async suggestPhoneticSpelling(
        firstName: string,
        lastName: string,
        languageHint: string = 'German / Swiss German / International'
    ): Promise<PhoneticSuggestion> {
        const systemPrompt = `You are an expert multilingual speech phonetician specializing in Text-to-Speech (TTS) optimization.
Your goal is to provide intuitive respellings or phonetic guides for athlete names so that Google Cloud Text-to-Speech speaks them accurately with natural inflection in ${languageHint}.
Respond ONLY with a valid JSON object in this exact format:
{
  "phoneticFirstName": "string",
  "phoneticLastName": "string",
  "explanation": "string explaining how it guides the pronunciation"
}`;

        const userPrompt = `Suggest phonetic TTS spelling for the athlete name:
First Name: "${firstName}"
Last Name: "${lastName}"
Language/Accent context: ${languageHint}`;

        try {
            const res = await this.generateContent(userPrompt, {
                systemInstruction: systemPrompt,
                temperature: 0.1,
                responseMimeType: 'application/json',
            });

            const parsed = JSON.parse(res.text.trim());
            return {
                phoneticFirstName: parsed.phoneticFirstName || firstName,
                phoneticLastName: parsed.phoneticLastName || lastName,
                explanation: parsed.explanation || 'Phonetically optimized for natural speech synthesis.',
            };
        } catch (err) {
            // Fallback to original names if generation fails
            return {
                phoneticFirstName: firstName,
                phoneticLastName: lastName,
                explanation: 'Standard spelling used.',
            };
        }
    }

    /**
     * Anti-Abuse Validation for User-Defined Phonetic Names
     * Ensures users cannot submit jokes, profanity, gibberish, or completely unrelated names.
     */
    public static async validatePhoneticName(
        realFirstName: string,
        realLastName: string,
        phoneticFirstName?: string | null,
        phoneticLastName?: string | null
    ): Promise<PhoneticValidationResult> {
        const pFirst = (phoneticFirstName || '').trim();
        const pLast = (phoneticLastName || '').trim();

        // If user clears phonetic names, that is always valid (reverts to real name)
        if (!pFirst && !pLast) {
            return { isValid: true };
        }

        // Basic sanity heuristics
        const combinedPhonetic = `${pFirst} ${pLast}`.trim();
        if (combinedPhonetic.length > 80) {
            return {
                isValid: false,
                reason: 'Phonetic name is too long (maximum 80 characters).',
            };
        }

        // Check for disallowed characters (only letters, spaces, hyphens, apostrophes, accents, and standard phonetic markers)
        const validCharsRegex = /^[a-zA-ZÀ-ÿ\u00C0-\u017F\s\-'.]+$/;
        if ((pFirst && !validCharsRegex.test(pFirst)) || (pLast && !validCharsRegex.test(pLast))) {
            return {
                isValid: false,
                reason: 'Phonetic name contains invalid symbols or numbers. Only letters, hyphens, and apostrophes are allowed.',
            };
        }

        // Check if Gemini is configured to do intelligent phonetic similarity and moderation
        try {
            const config = await SystemService.getGeminiConfig();
            if (!config.isConfigured || !config.enabled) {
                // If AI is offline, allow if character check passed
                return { isValid: true };
            }

            const systemPrompt = `You are a strict content safety and phonetic integrity moderator for a sports platform.
Athletes enter phonetic respellings of their names so tournament speaker announcements pronounce them correctly.

RULES:
1. The phonetic name MUST be a plausible phonetic pronunciation or respelling of the athlete's actual name.
2. STRICTLY REJECT: Profanity, vulgar words, sexual jokes, insults, memes, slurs, nonsense keyboard mashes (e.g., 'asdfghjk'), or entirely unrelated names/celebrities/characters (e.g. 'Batman', 'Darth Vader', 'Trump').
3. Allow reasonable multilingual pronunciations (e.g., French, German, Italian, Swiss-German, English, Slavic, Asian, Arabic phonetic adaptations).

Respond ONLY with a JSON object:
{
  "isValid": true | false,
  "reason": "Brief explanation if invalid, or empty string if valid"
}`;

            const userPrompt = `Real Name: "${realFirstName} ${realLastName}"
Submitted Phonetic Respelling: "${pFirst || realFirstName} ${pLast || realLastName}"

Evaluate if this is a legitimate phonetic representation and contains no abuse or vandalism.`;

            const res = await this.generateContent(userPrompt, {
                systemInstruction: systemPrompt,
                temperature: 0.1,
                responseMimeType: 'application/json',
            });

            const parsed = JSON.parse(res.text.trim());
            return {
                isValid: Boolean(parsed.isValid),
                reason: parsed.reason || (parsed.isValid ? undefined : 'The phonetic name does not match your real name or was flagged by content moderation.'),
            };
        } catch (err: any) {
            console.warn('Gemini phonetic validation check skipped due to API error:', err.message);
            // Non-blocking fallback
            return { isValid: true };
        }
    }
}
