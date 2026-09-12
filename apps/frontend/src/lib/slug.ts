export function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getCategorySlug(cat: { id: string; name?: string; slug?: string }): string {
    if (cat.slug) return cat.slug;
    if (cat.name) {
        const slug = slugify(cat.name);
        if (slug) return slug;
    }
    return cat.id;
}

export function findCategoryBySlug(categories: any[], slugOrId: string): any | undefined {
    if (!Array.isArray(categories) || !slugOrId) return undefined;
    const lower = decodeURIComponent(slugOrId).toLowerCase().trim();
    return categories.find(
        (cat) =>
            cat.id.toLowerCase() === lower ||
            (cat.slug && cat.slug.toLowerCase() === lower) ||
            getCategorySlug(cat).toLowerCase() === lower ||
            slugify(cat.name || '').toLowerCase() === lower
    );
}

