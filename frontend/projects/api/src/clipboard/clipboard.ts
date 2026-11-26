import { InjectionToken } from '@angular/core';

/**
 * The system clipboard (L2-061 AC3, L2-060 AC5; ADR 0105): `write` resolves `true` when the
 * clipboard took the text and `false` when it refused, and never rejects.
 */
export interface ClipboardApi {
  write(text: string): Promise<boolean>;
}

/** Binds {@link ClipboardApi}; a screen with a copy button provides it on its own route component. */
export const CLIPBOARD_SERVICE = new InjectionToken<ClipboardApi>('CLIPBOARD_SERVICE');
