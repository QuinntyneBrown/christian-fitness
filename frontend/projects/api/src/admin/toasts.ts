import { InjectionToken, type Signal } from '@angular/core';

/** One toast on screen (mock `admin-toast`): what happened and what it means. Rendered as text. */
export interface Toast {
  id: number;
  title: string;
  text: string;
}

/**
 * The toasts a screen shows (ADR 0015): `show` adds one that leaves by itself after about 6
 * seconds, `dismiss` removes one at once. At most three show at a time; a fourth pushes the oldest
 * out. Its timers end with the screen that provides it.
 */
export interface ToastsApi {
  readonly toasts: Signal<readonly Toast[]>;
  show(title: string, text: string): void;
  dismiss(id: number): void;
}

/** Binds {@link ToastsApi}; a screen that shows toasts provides it on its routed component. */
export const TOASTS_SERVICE = new InjectionToken<ToastsApi>('TOASTS_SERVICE');
