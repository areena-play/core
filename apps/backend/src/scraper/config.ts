import path from 'path';
import { SystemService } from '../services/system.service';

export interface ScraperConfig {
    baseUrl: string;
    fedNickname: string;
    clientId: string;
    clientSecret: string;
    webBaseUrl: string;
    clickttUsername: string;
    clickttPassword: string;
    storageDir: string;
    dataDir: string;
    cacheDir: string;
    checkpointsDir: string;
    requestDelayMs: number;
    concurrency: number;
    excludedClubs: string[];
    tournamentRetroDays: number;
}

const defaultStorageDir = path.resolve('./storage/clicktt_storage');

export const CONFIG: ScraperConfig = {
    baseUrl: process.env.CLICKTT_BASE_URL || process.env.BASE_URL || 'https://ttch-portal.liga.nu/rs',
    fedNickname: process.env.CLICKTT_FED || process.env.FED_NICKNAME || 'STT',
    clientId: process.env.CLICKTT_CLIENT_ID || process.env.CLIENT_ID || '',
    clientSecret: process.env.CLICKTT_CLIENT_SECRET || process.env.CLIENT_SECRET || '',
    webBaseUrl: process.env.CLICKTT_WEB_BASE_URL || 'https://click-tt.ch',
    clickttUsername: process.env.CLICKTT_USERNAME || process.env.CLICKTT_USER || '',
    clickttPassword: process.env.CLICKTT_PASSWORD || process.env.CLICKTT_PASS || '',
    storageDir: path.resolve(process.env.CLICKTT_STORAGE_DIR || defaultStorageDir),
    dataDir: path.resolve(process.env.CLICKTT_DATA_DIR || path.join(defaultStorageDir, 'data')),
    cacheDir: path.resolve(process.env.CLICKTT_CACHE_DIR || path.join(defaultStorageDir, 'cache')),
    checkpointsDir: path.resolve(path.join(defaultStorageDir, 'checkpoints')),
    requestDelayMs: parseInt(process.env.CLICKTT_DELAY_MS || process.env.REQUEST_DELAY_MS || '0', 10),
    concurrency: parseInt(process.env.CLICKTT_CONCURRENCY || process.env.CONCURRENCY || '25', 10),
    excludedClubs: ['T-Card', 'T-CARD', 't-card', 'T Card'],
    tournamentRetroDays: 30,
};

export async function loadScraperConfig(): Promise<ScraperConfig> {
    try {
        const settings = await SystemService.getAllSettingsMap();

        if (settings.has('CLICKTT_BASE_URL')) CONFIG.baseUrl = settings.get('CLICKTT_BASE_URL')!;
        if (settings.has('CLICKTT_FED')) CONFIG.fedNickname = settings.get('CLICKTT_FED')!;
        if (settings.has('CLICKTT_CLIENT_ID')) CONFIG.clientId = settings.get('CLICKTT_CLIENT_ID')!;
        if (settings.has('CLICKTT_CLIENT_SECRET')) CONFIG.clientSecret = settings.get('CLICKTT_CLIENT_SECRET')!;
        if (settings.has('CLICKTT_WEB_BASE_URL')) CONFIG.webBaseUrl = settings.get('CLICKTT_WEB_BASE_URL')!;
        if (settings.has('CLICKTT_USERNAME')) CONFIG.clickttUsername = settings.get('CLICKTT_USERNAME')!;
        if (settings.has('CLICKTT_PASSWORD')) CONFIG.clickttPassword = settings.get('CLICKTT_PASSWORD')!;
        if (settings.has('CLICKTT_DELAY_MS')) CONFIG.requestDelayMs = parseInt(settings.get('CLICKTT_DELAY_MS')!, 10);
        if (settings.has('CLICKTT_CONCURRENCY')) CONFIG.concurrency = parseInt(settings.get('CLICKTT_CONCURRENCY')!, 10);
        if (settings.has('CLICKTT_EXCLUDED_CLUBS')) {
            CONFIG.excludedClubs = settings.get('CLICKTT_EXCLUDED_CLUBS')!.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (settings.has('CLICKTT_TOURNAMENT_RETRO_DAYS')) {
            CONFIG.tournamentRetroDays = parseInt(settings.get('CLICKTT_TOURNAMENT_RETRO_DAYS')!, 10);
        }
    } catch {
        // Fallback to existing CONFIG defaults
    }

    return CONFIG;
}

export async function getScraperConfig(): Promise<ScraperConfig> {
    return loadScraperConfig();
}

export async function reloadScraperConfig(): Promise<ScraperConfig> {
    return loadScraperConfig();
}
