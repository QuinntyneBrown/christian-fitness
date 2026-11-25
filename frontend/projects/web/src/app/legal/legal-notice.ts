import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { LegalVersions, type LegalDocument } from '@cf/domain';

export const legalDate = (date: string) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date));
interface Revision {
  document: LegalDocument;
  date: string;
  summary: string;
}

@Injectable()
export class LegalNotice {
  private readonly dom = inject(DOCUMENT);
  private readonly revisions: Revision[] = (['privacy', 'terms'] as const)
    .flatMap((document) => {
      const meta = this.dom.querySelector<HTMLMetaElement>(
        'meta[name="cf-' + document + '-change"]',
      );
      return meta?.content && meta.dataset['summary']
        ? [{ document, date: meta.content, summary: meta.dataset['summary'] }]
        : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  private readonly now = signal(new Date());
  private readonly dismissed = signal('');
  readonly visible = computed(() =>
    this.revisions.filter(
      (revision) =>
        new LegalVersions({ privacy: [revision.date], terms: [revision.date] }).upcoming(
          revision.document,
          this.now(),
        ) === revision.date,
    ),
  );
  readonly banner = computed(() => this.visible().find((r) => r.date !== this.dismissed()));
  constructor() {
    if (!this.revisions.length) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      this.now.set(now);
      if (this.revisions.some((revision) => revision.date > now.toISOString().slice(0, 10))) {
        const next = new Date(now);
        next.setUTCHours(24, 0, 0, 0);
        timer = setTimeout(refresh, +next - +now);
      }
    };
    refresh();
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  dismiss(date: string) {
    this.dismissed.set(date);
    const h = this.dom.querySelector<HTMLElement>('main h1');
    if (h) {
      h.tabIndex = -1;
      h.focus();
    }
  }
}
