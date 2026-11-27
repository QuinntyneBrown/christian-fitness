import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DATA_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  Done,
  EmptyState,
  Link,
  Skeleton,
  SkeletonRegion,
} from '@cf/components';
import { downloadOutcomeOf, downloadReadyText } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpDataService } from '../../services/http-data.service';

/** Where the page is: checking the link, the download started, the link expired, or no answer. */
type Phase = 'checking' | 'ready' | 'expired' | 'failed';

/**
 * Download your data (L2-066 AC2; ADR 0117; mock `docs/mocks/pages/download/`), the emailed link,
 * in the member shell so a member signs in first. Skeletons while it checks the link; then it
 * starts the browser's download of the archive, says until when the link works and offers it
 * again; a link the API does not answer for (another member's, unknown, or past its 7 days) has
 * expired, with the way to request a new one; no answer offers Try again. The archive is read once
 * per press and handed to the browser through an object URL that is revoked straight after, or when
 * the page goes. Its service is this screen's own.
 */
@Component({
  selector: 'cf-download-page',
  imports: [Button, Container, Done, EmptyState, Link, Skeleton, SkeletonRegion],
  providers: [{ provide: DATA_SERVICE, useClass: HttpDataService }],
  templateUrl: './download-page.html',
  styleUrl: './download-page.scss',
})
export default class DownloadPage {
  private readonly data = inject(DATA_SERVICE);
  private readonly document = inject(DOCUMENT);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private request: Subscription | undefined;
  private archive: Subscription | undefined;
  private objectUrl: string | undefined;
  private revokeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly phase = signal<Phase>('checking');
  protected readonly readyText = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      this.archive?.unsubscribe();
      this.revoke();
    });
    this.check();
  }

  /** Checks the link and, when it works, starts the download; Try again checks it again. */
  protected check(): void {
    this.request?.unsubscribe();
    this.phase.set('checking');
    this.request = this.data.download(this.id).subscribe({
      next: (download) => {
        this.readyText.set(downloadReadyText(download.expiresAt));
        this.phase.set('ready');
        this.start();
      },
      error: (error: unknown) => this.phase.set(downloadOutcomeOf(error)),
    });
  }

  /** Reads the archive and hands it to the browser to save; Download again reads it again. */
  protected start(): void {
    this.archive?.unsubscribe();
    this.archive = this.data.archive(this.id).subscribe({
      next: (zip) => this.save(zip),
      error: (error: unknown) => this.phase.set(downloadOutcomeOf(error)),
    });
  }

  /** A link to the archive, made, pressed and dropped; its object URL is revoked once the save has begun. */
  private save(zip: Blob): void {
    this.revoke();
    this.objectUrl = URL.createObjectURL(zip);
    const link = this.document.createElement('a');
    link.href = this.objectUrl;
    link.download = 'christian-fitness-data.zip';
    link.click();
    this.revokeTimer = setTimeout(() => this.revoke(), 0);
  }

  private revoke(): void {
    clearTimeout(this.revokeTimer);
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
