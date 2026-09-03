import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { parseSearchTokens, generateSearchVariants } from '@areena/shared';

const router = Router();

export interface GlobalSearchResult {
    type: 'person' | 'club' | 'competition' | 'association' | 'page';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    badge?: string;
    avatarUrl?: string;
}

/**
 * GET /search/global?q=...
 * Unified cross-site search returning direct navigation links.
 */
router.get('/global', async (req: Request, res: Response, next) => {
    try {
        const query = (req.query.q as string)?.trim() || '';
        if (!query || query.length < 2) {
            return res.json({ results: [] });
        }

        const tokens = parseSearchTokens(query);
        const results: GlobalSearchResult[] = [];

        // Build token conditions for string fields
        const buildFieldOr = (fieldNames: string[]) => {
            return tokens.map((tok) => {
                if (tok.isExact) {
                    return {
                        OR: fieldNames.map((f) => ({ [f]: { contains: tok.text, mode: 'insensitive' } })),
                    };
                }
                const variants = generateSearchVariants(tok.text);
                return {
                    OR: variants.flatMap((v) =>
                        fieldNames.map((f) => ({ [f]: { contains: v, mode: 'insensitive' } }))
                    ),
                };
            });
        };

        // 1. Search People (Users)
        const userConditions = buildFieldOr(['firstName', 'lastName', 'email', 'licenseId', 'city']);
        const usersPromise = prisma.user.findMany({
            where: { AND: userConditions },
            take: 6,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                licenseId: true,
                city: true,
                avatarUrl: true,
            },
            orderBy: { lastName: 'asc' },
        });

        // 2. Search Clubs
        const clubConditions = buildFieldOr(['name', 'code', 'city', 'slug']);
        const clubsPromise = prisma.club.findMany({
            where: { AND: clubConditions },
            take: 5,
            select: {
                id: true,
                name: true,
                code: true,
                city: true,
                logoUrl: true,
                slug: true,
            },
            orderBy: { name: 'asc' },
        });

        // 3. Search Competitions (Tournaments & Leagues)
        const compConditions = buildFieldOr(['name', 'slug', 'description', 'location']);
        const compsPromise = prisma.competition.findMany({
            where: { AND: compConditions },
            take: 5,
            select: {
                id: true,
                name: true,
                type: true,
                status: true,
                slug: true,
                association: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // 4. Search Associations / Federations
        const assocConditions = buildFieldOr(['name', 'shortName', 'code', 'slug']);
        const assocsPromise = prisma.association.findMany({
            where: { AND: assocConditions },
            take: 3,
            select: {
                id: true,
                name: true,
                shortName: true,
                code: true,
                slug: true,
                logoUrl: true,
            },
            orderBy: { name: 'asc' },
        });

        const [users, clubs, comps, assocs] = await Promise.all([
            usersPromise,
            clubsPromise,
            compsPromise,
            assocsPromise,
        ]);

        // Transform Users into results
        users.forEach((u) => {
            results.push({
                type: 'person',
                id: u.id,
                title: `${u.firstName} ${u.lastName}`,
                subtitle: u.licenseId ? `License: ${u.licenseId} • ${u.email}` : u.email,
                href: `/people/${encodeURIComponent(u.licenseId || u.id)}`,
                badge: u.licenseId || 'Member',
                avatarUrl: u.avatarUrl || undefined,
            });
        });

        // Transform Clubs into results
        clubs.forEach((c) => {
            results.push({
                type: 'club',
                id: c.id,
                title: c.name,
                subtitle: c.city ? `${c.city} • Code: ${c.code}` : `Code: ${c.code}`,
                href: `/club/${c.id}`,
                badge: c.code || 'Club',
                avatarUrl: c.logoUrl || undefined,
            });
        });

        // Transform Competitions into results
        comps.forEach((cmp) => {
            results.push({
                type: 'competition',
                id: cmp.id,
                title: cmp.name,
                subtitle: cmp.association?.name ? `${cmp.type} • ${cmp.association.name}` : cmp.type,
                href: `/competition/${cmp.id}`,
                badge: cmp.type,
            });
        });

        // Transform Associations into results
        assocs.forEach((a) => {
            results.push({
                type: 'association',
                id: a.id,
                title: a.name,
                subtitle: a.code ? `Federation • Code: ${a.code}` : 'Federation',
                href: `/association/${a.id}`,
                badge: a.code || 'Assoc',
                avatarUrl: a.logoUrl || undefined,
            });
        });

        // 5. Built-in Static Site Navigation Matches & Tools (Multilingual: EN, DE, FR, IT)
        const staticPages = [
            {
                title: 'ELO Rating Calculator',
                subtitle: 'Simulate match outcome points, win probabilities, and rating changes',
                href: '/utilities/elo-calculator',
                badge: 'Tool',
                keywords: [
                    // EN
                    'elo', 'calculator', 'rating', 'points', 'simulate', 'rank', 'probability', 'score', 'match', 'calculation', 'utilities',
                    // DE
                    'elo-rechner', 'rechner', 'punkte', 'berechnung', 'simulation', 'wertung', 'rang', 'wahrscheinlichkeit', 'spiel', 'dienstprogramme',
                    // FR
                    'calculateur', 'calculateur elo', 'points', 'simulation', 'probabilité', 'classement', 'score', 'utilitaires',
                    // IT
                    'calcolatore', 'calcolatore elo', 'punti', 'simulazione', 'probabilità', 'classifica', 'utilità',
                ],
            },
            {
                title: 'User Manual & Documentation',
                subtitle: 'Step-by-step guides, rulebooks, and platform tutorials',
                href: '/manual',
                badge: 'Guide',
                keywords: [
                    // EN
                    'manual', 'documentation', 'guide', 'docs', 'help', 'tutorial', 'instructions', 'handbook', 'faq', 'rules',
                    // DE
                    'benutzerhandbuch', 'handbuch', 'anleitung', 'dokumentation', 'hilfe', 'regeln', 'leitfaden', 'tutorial',
                    // FR
                    'manuel', 'manuel d utilisation', 'guide', 'documentation', 'aide', 'tutoriel', 'instructions', 'règles',
                    // IT
                    'manuale', 'manuale utente', 'guida', 'documentazione', 'aiuto', 'tutorial', 'istruzioni', 'regole',
                ],
            },
            {
                title: 'Support & Help Desk',
                subtitle: 'Submit support requests, ask questions, or report platform issues',
                href: '/support',
                badge: 'Support',
                keywords: [
                    // EN
                    'support', 'help', 'ticket', 'contact', 'assistance', 'issue', 'problem', 'question', 'service', 'faq',
                    // DE
                    'hilfe', 'kundendienst', 'kontakt', 'anfrage', 'problem', 'frage', 'unterstützung',
                    // FR
                    'assistance', 'aide', 'contact', 'billet', 'problème', 'question', 'service client',
                    // IT
                    'assistenza', 'supporto', 'aiuto', 'contatto', 'problema', 'domanda',
                ],
            },
            {
                title: 'Level & Skill Table',
                subtitle: 'Official skill divisions, classification ranges, and point tiers',
                href: '/utilities/level-table',
                badge: 'Tool',
                keywords: [
                    // EN
                    'level', 'tier', 'table', 'classification', 'divisions', 'skill', 'ranks', 'utilities',
                    // DE
                    'stufentabelle', 'stufe', 'tabelle', 'klassierung', 'divisionen', 'kategorie', 'kategorien', 'rangliste', 'dienstprogramme',
                    // FR
                    'tableau des niveaux', 'niveau', 'classement', 'divisions', 'catégorie', 'utilitaires',
                    // IT
                    'tabella dei livelli', 'livello', 'classificazione', 'divisioni', 'categoria', 'utilità',
                ],
            },
            {
                title: 'Developer API & Webhooks',
                subtitle: 'REST endpoints, API token keys, Swagger docs, and webhook integrations',
                href: '/developers',
                badge: 'Dev',
                keywords: [
                    // EN
                    'developer', 'api', 'tokens', 'keys', 'rest', 'endpoints', 'webhooks', 'swagger', 'code', 'oauth',
                    // DE
                    'entwickler', 'entwickler-api', 'schnittstelle', 'schlüssel',
                    // FR
                    'développeur', 'api développeur', 'jetons', 'clés',
                    // IT
                    'sviluppatore', 'api sviluppatore', 'chiavi',
                ],
            },
            {
                title: 'People & Member Directory',
                subtitle: 'Browse all licensed players, referees, coaches, and platform members',
                href: '/people',
                badge: 'Page',
                keywords: [
                    // EN
                    'people', 'players', 'coaches', 'referees', 'members', 'directory', 'licenses', 'users', 'officials',
                    // DE
                    'personen', 'mitglieder', 'spieler', 'schiedsrichter', 'trainer', 'funktionäre', 'benutzer', 'lizenzen',
                    // FR
                    'personnes', 'membres', 'joueurs', 'arbitres', 'entraîneurs', 'officiels', 'utilisateurs', 'licences',
                    // IT
                    'persone', 'membri', 'giocatori', 'arbitri', 'allenatori', 'ufficiali', 'utenti', 'licenze',
                ],
            },
            {
                title: 'Clubs Overview',
                subtitle: 'Explore registered sports clubs, teams, and home venues',
                href: '/clubs',
                badge: 'Page',
                keywords: [
                    // EN
                    'clubs', 'teams', 'organizations', 'venues', 'gyms',
                    // DE
                    'vereine', 'klubs', 'mannschaften', 'vereinsübersicht', 'teams', 'sportstätten', 'hallen',
                    // FR
                    'clubs', 'équipes', 'organisations', 'salles',
                    // IT
                    'società', 'club', 'squadre', 'organizzazioni', 'palestre',
                ],
            },
            {
                title: 'Competitions & Tournaments',
                subtitle: 'Championships, seasonal leagues, tournaments, brackets, and draws',
                href: '/competitions',
                badge: 'Page',
                keywords: [
                    // EN
                    'competitions', 'tournaments', 'leagues', 'events', 'brackets', 'draws', 'championship',
                    // DE
                    'wettbewerbe', 'turniere', 'ligen', 'meisterschaft', 'auslosung', 'begegnungen', 'events',
                    // FR
                    'compétitions', 'tournois', 'ligues', 'championnat', 'tirages', 'événements',
                    // IT
                    'competizioni', 'tornei', 'leghe', 'campionato', 'tabelloni', 'eventi',
                ],
            },
            {
                title: 'Calendar & Fixtures Schedule',
                subtitle: 'Upcoming tournament dates, encounter schedules, and training sessions',
                href: '/calendar',
                badge: 'Page',
                keywords: [
                    // EN
                    'calendar', 'schedule', 'fixtures', 'dates', 'events', 'timetable', 'agenda',
                    // DE
                    'kalender', 'zeitplan', 'termine', 'spieldaten', 'spielplan', 'agenda',
                    // FR
                    'calendrier', 'calendrier des matchs', 'dates', 'horaire', 'programme', 'agenda',
                    // IT
                    'calendario', 'programma', 'date', 'orario', 'agenda',
                ],
            },
            {
                title: 'Audit Trail & Governance Logs',
                subtitle: 'Platform security history, administrative action records, and audit logs',
                href: '/audit-trail',
                badge: 'Audit',
                keywords: [
                    // EN
                    'audit', 'logs', 'security', 'trail', 'history', 'governance', 'tracking',
                    // DE
                    'audit', 'protokoll', 'aktivitätsprotokoll', 'sicherheit', 'verlauf', 'aktivitäten',
                    // FR
                    'audit', 'journal', 'historique', 'sécurité', 'activités',
                    // IT
                    'audit', 'registro', 'cronologia', 'sicurezza', 'attività',
                ],
            },
            {
                title: 'System Notices & Announcements',
                subtitle: 'Official broadcasts, alerts, and federation updates',
                href: '/notices',
                badge: 'News',
                keywords: [
                    // EN
                    'notices', 'news', 'announcements', 'broadcasts', 'bulletins', 'alerts',
                    // DE
                    'mitteilungen', 'nachrichten', 'ankündigungen', 'meldungen', 'rundschreiben',
                    // FR
                    'annonces', 'actualités', 'avis', 'bulletins',
                    // IT
                    'avvisi', 'notizie', 'annunci', 'comunicazioni',
                ],
            },
            {
                title: 'My Profile & Settings',
                subtitle: 'Manage personal details, contact info, and security preferences',
                href: '/profile',
                badge: 'Account',
                keywords: [
                    // EN
                    'profile', 'account', 'settings', 'password', 'email', 'security', 'avatar',
                    // DE
                    'profil', 'konto', 'einstellungen', 'passwort', 'sicherheit', 'benutzerkonto',
                    // FR
                    'profil', 'compte', 'paramètres', 'mot de passe', 'sécurité',
                    // IT
                    'profilo', 'account', 'impostazioni', 'password', 'sicurezza',
                ],
            },
        ];

        staticPages.forEach((p) => {
            const searchableBlob = `${p.title} ${p.subtitle} ${p.keywords.join(' ')}`;
            const matches = tokens.every((tok) => {
                const variants = tok.isExact ? [tok.text] : generateSearchVariants(tok.text);
                const blobLower = searchableBlob.toLowerCase();
                return variants.some((v) => blobLower.includes(v.toLowerCase()));
            });

            if (matches) {
                results.push({
                    type: 'page',
                    id: p.href,
                    title: p.title,
                    subtitle: p.subtitle,
                    href: p.href,
                    badge: p.badge || 'Page',
                });
            }
        });

        res.json({ results });
    } catch (err) {
        next(err);
    }
});

export default router;