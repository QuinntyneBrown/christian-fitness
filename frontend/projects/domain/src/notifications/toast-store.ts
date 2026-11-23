import { Injectable, type OnDestroy, signal } from '@angular/core';
import type { Toast, ToastsApi } from '@cf/api';

/** How long a toast shows before it leaves by itself (mock `admin-toast`; ADR 0015). */
export const TOAST_LIFETIME_MS = 6_000;

/** The most toasts on screen at once; a newer one pushes the oldest out. */
export const TOAST_LIMIT = 3;

/**
 * {@link ToastsApi} with a timer per toast. Provided on the routed component of the screen that
 * shows toasts, so its timers end with the visit (AGENTS.md, "Release everything you acquire").
 */
@Injectable()
export class ToastStore implements ToastsApi, OnDestroy {
  private readonly shown = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this.shown.asReadonly();

  show(title: string, text: string): void {
    const id = this.nextId++;
    const kept = [...this.shown(), { id, title, text }];
    for (const old of kept.splice(0, Math.max(0, kept.length - TOAST_LIMIT))) this.forget(old.id);
    this.shown.set(kept);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), TOAST_LIFETIME_MS),
    );
  }

  dismiss(id: number): void {
    this.forget(id);
    this.shown.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.shown.set([]);
  }

  private forget(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
}
