import { spawn, spawnSync } from 'child_process';
import { Response } from 'express';
import fs from 'fs';
import { config } from '../config/env';

export interface PgConnectionInfo {
    user: string;
    password?: string;
    host: string;
    port: string;
    database: string;
}

/**
 * Parses PostgreSQL database URL into connection parameters
 */
function parseDatabaseUrl(urlStr: string): PgConnectionInfo {
    try {
        const parsed = new URL(urlStr);
        return {
            user: decodeURIComponent(parsed.username || 'areena_admin'),
            password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
            host: parsed.hostname || 'localhost',
            port: parsed.port || '5432',
            database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'areena_db',
        };
    } catch {
        return {
            user: 'areena_admin',
            host: 'localhost',
            port: '5432',
            database: 'areena_db',
        };
    }
}

/**
 * Resolves the appropriate command and arguments to execute PostgreSQL backup/restore tools.
 * Supports:
 * 1. Native CLI binary (pg_dump / pg_restore / psql) if available on system PATH
 * 2. Docker container execution (docker exec areena-postgres pg_dump/pg_restore) as fallback
 */
function resolvePgCommand(tool: 'pg_dump' | 'pg_restore' | 'psql'): {
    cmd: string;
    args: string[];
    env: NodeJS.ProcessEnv;
} {
    const conn = parseDatabaseUrl(config.databaseUrl || process.env.DATABASE_URL || '');
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (conn.password) {
        env.PGPASSWORD = conn.password;
    }

    // 1. Check if native binary is present in system PATH
    const nativeCheck = spawnSync(tool, ['--version'], { stdio: 'ignore' });
    if (nativeCheck.status === 0) {
        return {
            cmd: tool,
            args: ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database],
            env,
        };
    }

    // 2. Check if Docker is available and areena-postgres container is healthy
    const dockerCheck = spawnSync('docker', ['exec', 'areena-postgres', 'pg_isready'], { stdio: 'ignore' });
    if (dockerCheck.status === 0) {
        const dockerArgs = ['exec', '-i'];
        if (conn.password) {
            dockerArgs.push('-e', `PGPASSWORD=${conn.password}`);
        }
        dockerArgs.push('areena-postgres', tool, '-U', conn.user, '-d', conn.database);

        return {
            cmd: 'docker',
            args: dockerArgs,
            env: process.env,
        };
    }

    throw new Error(
        `Neither the "${tool}" executable nor the "areena-postgres" Docker container could be found. ` +
        `Please ensure PostgreSQL client tools are installed or start the areena-postgres container.`
    );
}

export class DatabaseBackupService {
    /**
     * Streams a compressed native PostgreSQL backup (.dump) directly to the Express HTTP response.
     */
    static async streamDatabaseDump(res: Response): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('[DatabaseBackup] 📦 Starting native PostgreSQL database dump stream...');

            let pgDumpProc: any;
            try {
                const { cmd, args, env } = resolvePgCommand('pg_dump');
                const fullArgs = [...args, '--format=custom', '--no-owner', '--no-privileges'];

                console.log(`[DatabaseBackup] Executing: ${cmd} ${fullArgs.join(' ')}`);
                pgDumpProc = spawn(cmd, fullArgs, { env });
            } catch (err) {
                return reject(err);
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `areena-database-backup-${timestamp}.dump`;

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            let stderrOutput = '';
            pgDumpProc.stderr.on('data', (chunk: Buffer) => {
                stderrOutput += chunk.toString('utf8');
            });

            pgDumpProc.stdout.pipe(res);

            pgDumpProc.on('error', (err: Error) => {
                console.error('[DatabaseBackup] ❌ pg_dump process error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: `pg_dump failed: ${err.message}` });
                }
                reject(err);
            });

            pgDumpProc.on('close', (code: number) => {
                if (code === 0) {
                    console.log(`[DatabaseBackup] ✅ Database dump stream completed successfully (${filename})`);
                    resolve();
                } else {
                    console.error(`[DatabaseBackup] ❌ pg_dump exited with error code ${code}:`, stderrOutput);
                    if (!res.headersSent) {
                        res.status(500).json({ error: `pg_dump failed (code ${code}): ${stderrOutput}` });
                    }
                    reject(new Error(`pg_dump exited with code ${code}: ${stderrOutput}`));
                }
            });
        });
    }

    /**
     * Restores a database backup from an uploaded file (.dump / .sql) using pg_restore or psql.
     */
    static async restoreDatabaseFromFile(filePath: string): Promise<{ success: boolean; message: string }> {
        return new Promise((resolve, reject) => {
            console.log(`[DatabaseBackup] 🔄 Starting native database restore from file: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                return reject(new Error('Uploaded backup file does not exist on server.'));
            }

            // Check if file is plaintext SQL or custom binary dump
            const isPlainSql = filePath.endsWith('.sql');
            const tool = isPlainSql ? 'psql' : 'pg_restore';

            let restoreProc: any;
            try {
                const { cmd, args, env } = resolvePgCommand(tool);
                const fullArgs = isPlainSql
                    ? [...args]
                    : [...args, '--clean', '--if-exists', '--no-owner', '--no-privileges'];

                console.log(`[DatabaseBackup] Executing restore: ${cmd} ${fullArgs.join(' ')}`);
                restoreProc = spawn(cmd, fullArgs, { env });
            } catch (err) {
                return reject(err);
            }

            let stderrOutput = '';
            restoreProc.stderr.on('data', (chunk: Buffer) => {
                stderrOutput += chunk.toString('utf8');
            });

            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(restoreProc.stdin);

            restoreProc.on('error', (err: Error) => {
                console.error(`[DatabaseBackup] ❌ ${tool} process error:`, err);
                reject(err);
            });

            restoreProc.on('close', (code: number) => {
                // Remove temporary file
                try {
                    fs.unlinkSync(filePath);
                } catch {}

                // pg_restore returns exit code 1 if there were non-fatal warnings (e.g. dropping objects that didn't exist yet)
                // We treat this as success if no fatal error occurred.
                if (code === 0 || code === 1) {
                    console.log(`[DatabaseBackup] ✅ Database restore completed successfully.`);
                    resolve({
                        success: true,
                        message: 'Database backup successfully restored.',
                    });
                } else {
                    console.error(`[DatabaseBackup] ❌ ${tool} exited with error code ${code}:`, stderrOutput);
                    reject(new Error(`Database restore failed (code ${code}): ${stderrOutput}`));
                }
            });
        });
    }
}
