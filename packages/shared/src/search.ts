/**
 * Normalizes text for standard accent/diacritic-insensitive matching.
 * E.g., ""Müller"" -> ""muller"", ""René"" -> ""rene"", ""Zürich"" -> ""zurich""
 */
export function normalizeDiacritics(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Checks if a string contains any accented/diacritic character.
 */
export function hasDiacritics(str: string): boolean {
    return str !== str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Generates search variants for database LIKE/contains matching:
 * - If user types plain letters (e.g. ""u"", ""e"", ""muller"", ""rene""), it generates accented variants
 *   (e.g. ""müller"", ""mueller"", ""rené"", ""renè"") so plain input matches accented records.
 * - If user explicitly types an accented letter (e.g. ""ü"", ""é"", ""müller""), it does NOT downgrade to plain
 *   (i.e., typing ""ü"" only matches ""ü"", NOT ""u"").
 */
export function generateSearchVariants(text: string): string[] {
    if (!text) return [];
    const lower = text.toLowerCase();
    const variants = new Set<string>();

    variants.add(text);
    variants.add(lower);

    // If user explicitly typed a specific accented character (e.g. 'ü' or 'é'), respect their exact intent
    if (hasDiacritics(text)) {
        return Array.from(variants);
    }

    // Otherwise, expand plain letters to include their accented counterparts
    if (lower.includes('u')) variants.add(lower.replace(/u/g, 'ü'));
    if (lower.includes('ue')) variants.add(lower.replace(/ue/g, 'ü'));
    if (lower.includes('o')) variants.add(lower.replace(/o/g, 'ö'));
    if (lower.includes('oe')) variants.add(lower.replace(/oe/g, 'ö'));
    if (lower.includes('a')) variants.add(lower.replace(/a/g, 'ä'));
    if (lower.includes('ae')) variants.add(lower.replace(/ae/g, 'ä'));
    if (lower.includes('e')) {
        variants.add(lower.replace(/e/g, 'é'));
        variants.add(lower.replace(/e/g, 'è'));
        variants.add(lower.replace(/e/g, 'ê'));
    }
    if (lower.includes('ss')) variants.add(lower.replace(/ss/g, 'ß'));

    return Array.from(variants).filter(Boolean);
}

export interface SearchToken {
    text: string;
    isExact: boolean; // true if enclosed in quotes (e.g. ""René"")
}

/**
 * Parses a search query string into structured tokens.
 * Handles quoted phrases (e.g. '""René Müller"" active') where quoted text
 * is preserved as a single exact token, and unquoted text is split by whitespace.
 */
export function parseSearchTokens(query: string): SearchToken[] {
    if (!query || typeof query !== 'string') return [];

    const tokens: SearchToken[] = [];
    const regex = /"([^"]+)"|(\S+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(query)) !== null) {
        if (match[1] !== undefined) {
            const text = match[1].trim();
            if (text) {
                tokens.push({ text, isExact: true });
            }
        } else if (match[2] !== undefined) {
            const text = match[2].trim();
            if (text) {
                tokens.push({ text, isExact: false });
            }
        }
    }

    return tokens;
}

/**
 * Evaluates whether a target text matches all tokens in a parsed search query.
 * - Quoted token (isExact): Substring exact match.
 * - Unquoted token WITH diacritics (e.g. 'müller' or 'ü'): Must match the actual accented string in target text (case-insensitive).
 * - Unquoted token WITHOUT diacritics (e.g. 'muller' or 'u'): Matches both plain and accented forms ('Muller' and 'Müller').
 */
export function matchesSearchQuery(targetText: string, tokens: SearchToken[]): boolean {
    if (!tokens || tokens.length === 0) return true;
    if (!targetText) return false;

    const lowerTarget = targetText.toLowerCase();
    const normalizedTarget = normalizeDiacritics(targetText);

    return tokens.every((tok) => {
        if (tok.isExact || hasDiacritics(tok.text)) {
            // Explicitly accented or quoted: target must contain the exact accented characters
            return lowerTarget.includes(tok.text.toLowerCase());
        }
        // Plain unaccented token: match against normalized diacritics (e.g. 'muller' matches 'Müller')
        const normalizedToken = normalizeDiacritics(tok.text);
        return normalizedTarget.includes(normalizedToken);
    });
}