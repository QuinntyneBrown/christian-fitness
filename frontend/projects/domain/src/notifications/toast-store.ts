import { Injectable, type OnDestroy, signal } from '@angular/core';
import type { Toast, ToastsApi } from '@cf/api';

/** How long a toast shows before it leaves by itself (mock `admin-toast`; ADR 0020). */
export const TOAST_LIFETIME_MS = 6_000;

/** The most toasts on screen at once; a newer one pushes the oldest out. */
export const TOAST_LIMIT = 3;

/**
 * {@link ToastsApi} with a timer per toast, held while the region is paused (WCAG 2.2.1) and given
 * back its time left on resume. Provided on the routed component of the screen that shows toasts,
 * so its timers end with the visit (AGENTS.md, "Release everything you acquire").
 */
@Injectable()
export class ToastStore implements ToastsApi, OnDestroy {
  private readonly shown = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  /** When each running toast leaves, or, while paused, how long it has left. */
  private readonly due = new Map<number, number>();
  private paused = false;
  private nextId = 1;

  readonly toasts = this.shown.asReadonly();

  show(title: string, text: string): void {
    const id = this.nextId++;
    const kept = [...this.shown(), { id, title, text }];
    for (const old of kept.splice(0, Math.max(0, kept.length - TOAST_LIMIT))) this.forget(old.id);
    this.shown.set(kept);
    if (this.paused) this.due.set(id, TOAST_LIFETIME_MS);
    else this.start(id, TOAST_LIFETIME_MS);
  }

  dismiss(id: number): void {
    this.forget(id);
    this.shown.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  pause(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    const now = Date.now();
    for (const [id, value] of [...this.due]) {
      if (paused) {
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
        this.due.set(id, Math.max(0, value - now));
      } else {
        this.start(id, value);
      }
    }
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.due.clear();
    this.shown.set([]);
  }

  private start(id: number, ms: number): void {
    this.due.set(id, Date.now() + ms);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), ms),
    );
  }

  private forget(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.due.delete(id);
  }
}
