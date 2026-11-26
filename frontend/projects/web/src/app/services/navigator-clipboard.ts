import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import type { ClipboardApi } from '@cf/api';

/**
 * {@link ClipboardApi} through the browser's asynchronous clipboard: `false` when there is none,
 * or when the browser or the person refuses (ADR 0105). Provided on the screen that copies.
 */
@Injectable()
export class NavigatorClipboard implements ClipboardApi {
  private readonly clipboard = inject(DOCUMENT).defaultView?.navigator.clipboard;

  async write(text: string): Promise<boolean> {
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
