import { storageManager } from '../storageManager';

export class PlayerResolver {
    private byPersonId = new Map<string, string>();
    private byName = new Map<string, string>();
    private byLicence = new Map<string, any>();
    private loaded = false;

    normalizeName(name: string | null | undefined): string {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/[^a-z0-9äöüéèà\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async load() {
        if (this.loaded) return;
        for await (const p of storageManager.streamRecords('players')) {
            const licence = String(p.licenceNr || '').trim();
            if (!licence) continue;

            this.byLicence.set(licence, p);

            if (p.personId) {
                this.byPersonId.set(String(p.personId).trim(), licence);
            }

            if (p.fullName) {
                const norm1 = this.normalizeName(p.fullName);
                if (!this.byName.has(norm1)) this.byName.set(norm1, licence);
            }
            if (p.firstname && p.lastname) {
                const norm2 = this.normalizeName(`${p.firstname} ${p.lastname}`);
                const norm3 = this.normalizeName(`${p.lastname} ${p.firstname}`);
                if (!this.byName.has(norm2)) this.byName.set(norm2, licence);
                if (!this.byName.has(norm3)) this.byName.set(norm3, licence);
            }
        }
        this.loaded = true;
    }

    resolveLicence(params: { personId?: string | null; name?: string | null; licenceNr?: string | null }): string | null {
        const { personId = null, name = null, licenceNr = null } = params;
        if (licenceNr && this.byLicence.has(String(licenceNr))) {
            return String(licenceNr);
        }
        if (personId && this.byPersonId.has(String(personId).trim())) {
            return this.byPersonId.get(String(personId).trim())!;
        }
        if (name) {
            const norm = this.normalizeName(name);
            if (this.byName.has(norm)) {
                return this.byName.get(norm)!;
            }
            if (name.includes(',')) {
                const [last, first] = name.split(',').map((s) => s.trim());
                const reversed = this.normalizeName(`${first} ${last}`);
                if (this.byName.has(reversed)) {
                    return this.byName.get(reversed)!;
                }
            }
        }
        return null;
    }

    getPlayer(licenceNr: string | number): any | null {
        return this.byLicence.get(String(licenceNr)) || null;
    }
}

export const playerResolver = new PlayerResolver();

