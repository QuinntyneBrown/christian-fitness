import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { LEGAL_NOTICE, type LegalRevision, type LegalNoticeView } from '@cf/api';

export const legalDate = (date: string) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date));
@Injectable()
class LegalNotice implements LegalNoticeView {
  private readonly dom = inject(DOCUMENT);
  private readonly revisions: LegalRevision[] = (['privacy', 'terms'] as const)
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
  private readonly dismissed = signal<readonly string[]>([]);
  readonly visible = computed(() =>
    this.revisions.filter((revision) => revision.date > this.now().toISOString().slice(0, 10)),
  );
  readonly banner = computed(() => {
    const pending = this.visible().filter((revision) => !this.dismissed().includes(revision.date));
    const first = pending[0];
    if (!first) return undefined;
    const documents = pending.filter((revision) => revision.date === first.date);
    const title =
      documents.length === 2
        ? 'Privacy Policy and Terms'
        : first.document === 'privacy'
          ? 'Privacy Policy'
          : 'Terms of Service';
    return { ...first, title };
  });
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
    this.dismissed.update((dates) => [...dates, date]);
    const h = this.dom.querySelector<HTMLElement>('main h1');
    if (h) {
      h.tabIndex = -1;
      h.focus();
    }
  }
}

export const legalNoticeProvider = { provide: LEGAL_NOTICE, useClass: LegalNotice };
