import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { StoryReadsApi } from '@cf/api';
import { storyReadLog } from '@cf/domain';

/** Where the browser keeps the hashed ids of the stories it counted, with when (ADR 0105). */
const LOG_KEY = 'cf-story-reads';

/**
 * {@link StoryReadsApi} over local storage and `POST /api/public/stories/{id}/reads` (L2-061
 * AC12; ADR 0105). The log names each story by the SHA-256 of its id, so it shows no story in
 * clear; `storyReadLog` decides whether a read counts and drops entries a day old. Without
 * storage or Web Crypto a read is still sent, once per visit; a failed send is dropped unseen.
 */
@Injectable()
export class LocalStoryReads implements StoryReadsApi {
  private readonly http = inject(HttpClient);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);

  count(storyId: string): void {
    void this.keyOf(storyId).then((key) => {
      if (this.destroyRef.destroyed) return;
      const storage = this.storage();
      const log = storyReadLog(this.read(storage), key, Date.now());
      if (!log.counts) return;
      try {
        storage?.setItem(LOG_KEY, log.next);
      } catch {
        // Full or refused: the read still counts this once.
      }
      this.http
        .post<void>(`/api/public/stories/${encodeURIComponent(storyId)}/reads`, null)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
    });
  }

  /** The hex SHA-256 of the id, or the id itself where Web Crypto is missing (it is then never stored). */
  private async keyOf(storyId: string): Promise<string> {
    const subtle = this.window?.crypto?.subtle;
    if (!subtle) return storyId;
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(storyId));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private storage(): Storage | null {
    try {
      return this.window?.crypto?.subtle ? (this.window.localStorage ?? null) : null;
    } catch {
      return null;
    }
  }

  private read(storage: Storage | null): string | null {
    try {
      return storage?.getItem(LOG_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
