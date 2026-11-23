import {
  booleanAttribute,
  Component,
  DestroyRef,
  inject,
  input,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';

/** The design system's spinner sizes: 16 px inline, 20 px by default, 40 px for a section. */
export type SpinnerSize = 'sm' | 'md' | 'lg';

/** How long a wait lasts before a spinner shows, so fast answers do not flash. */
export const SPINNER_DELAY_MS = 300;

/**
 * The design system's region spinner (docs/design-system/components/spinner.html): a rotating
 * ring, hidden from assistive technology, always beside words that say what is loading
 * ("Refreshing…"), visible or, with `hideLabel`, visually hidden. It appears only after `delay`
 * (300 ms by default) and drops its timer when destroyed. Under reduced motion the ring stands
 * still, half filled. The busy region around it carries `aria-busy`; a busy button uses the
 * spinning icon instead.
 */
@Component({
  selector: 'cf-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
})
export class Spinner implements OnInit {
  readonly label = input.required<string>();
  readonly size = input<SpinnerSize>('md');
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly delay = input(SPINNER_DELAY_MS, { transform: numberAttribute });

  protected readonly shown = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const delay = this.delay();
    if (delay <= 0) {
      this.shown.set(true);
      return;
    }
    const timer = setTimeout(() => this.shown.set(true), delay);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
