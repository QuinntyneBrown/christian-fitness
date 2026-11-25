import { Component, computed, inject, input } from '@angular/core';
import { Banner } from '@cf/components';
import { LEGAL_NOTICE, type LegalDocument } from '@cf/api';
import { legalDate } from './legal-notice';

@Component({
  selector: 'cf-legal-change',
  imports: [Banner],
  templateUrl: './legal-change.html',
  styleUrl: './legal-change.scss',
})
export class LegalChange {
  readonly summaryFor = input<LegalDocument>();
  protected readonly notices = inject(LEGAL_NOTICE);
  protected readonly dateLabel = legalDate;
  protected readonly summary = computed(() =>
    this.notices.visible().find((r) => r.document === this.summaryFor()),
  );
}
