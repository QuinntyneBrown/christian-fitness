import type { LegalDocument } from '@cf/api';
export type { LegalDocument } from '@cf/api';
type Schedule = Record<LegalDocument, readonly string[]>;
export class LegalVersions {
  constructor(
    private readonly versions: Schedule = { privacy: ['2026-04-01'], terms: ['2026-04-01'] },
  ) {}
  inForce(document: LegalDocument, now = new Date()): string | null {
    const today = now.toISOString().slice(0, 10);
    return this.versions[document].filter((date) => date <= today).at(-1) ?? null;
  }
  upcoming(document: LegalDocument, now = new Date()): string | null {
    const today = now.toISOString().slice(0, 10);
    const limit = new Date(now);
    limit.setUTCDate(limit.getUTCDate() + 30);
    return (
      this.versions[document].find(
        (date) => date > today && date <= limit.toISOString().slice(0, 10),
      ) ?? null
    );
  }
}
