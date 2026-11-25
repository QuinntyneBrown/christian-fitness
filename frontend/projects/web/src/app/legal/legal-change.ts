import { Component, computed, inject, input } from '@angular/core';
import { Banner } from '@cf/components';
import type { LegalDocument } from '@cf/domain';
import { LegalNotice, legalDate } from './legal-notice';

@Component({
  selector: 'cf-legal-change',
  imports: [Banner],
  templateUrl: './legal-change.html',
  styleUrl: './legal-change.scss',
})
export class LegalChange {
  readonly summaryFor = input<LegalDocument>();
  protected readonly notices = inject(LegalNotice);
  protected readonly dateLabel = legalDate;
  protected readonly summary = computed(() =>
    this.notices.visible().find((r) => r.document === this.summaryFor()),
  );
}
