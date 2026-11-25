import { InjectionToken, type Signal } from '@angular/core';

export type LegalDocument = 'privacy' | 'terms';

export interface LegalRevision {
  readonly document: LegalDocument;
  readonly date: string;
  readonly summary: string;
}

export interface LegalNoticeView {
  readonly visible: Signal<readonly LegalRevision[]>;
  readonly banner: Signal<(LegalRevision & { title: string }) | undefined>;
  dismiss(date: string): void;
}

export const LEGAL_NOTICE = new InjectionToken<LegalNoticeView>('LEGAL_NOTICE');
