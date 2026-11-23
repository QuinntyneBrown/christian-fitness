import { Component, computed, ElementRef, inject, input, type OnChanges } from '@angular/core';

/** The design system's progress tones: in progress, complete and failed. */
export type ProgressTone = 'default' | 'success' | 'danger';

/** A progress value as a whole percent between 0 and 100. */
export function clampPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * The design system's progress bar (docs/design-system/components/progress-bar.html): how far
 * along a task is, for a wait longer than a couple of seconds. The `progress__track` is a
 * `progressbar` named by the visible `label`, with `aria-valuenow` from `value` (a percent, held
 * between 0 and 100) and the value shown in words, so length and colour are never the only
 * carriers. With no `value` the length is not known: the bar slides (`progress--indeterminate`)
 * and omits the value; under reduced motion it stands full and faded. `tone` turns a finished bar
 * green or a failed one red; say so in the label too ("Upload stopped").
 */
@Component({
  selector: 'cf-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBar implements OnChanges {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input.required<string>();
  /** The percent done; none while the length is not known. */
  readonly value = input<number | null>(null);
  readonly tone = input<ProgressTone>('default');

  protected readonly percent = computed(() => {
    const value = this.value();
    return value === null ? null : clampPercent(value);
  });

  protected readonly width = computed(() => {
    const percent = this.percent();
    return percent === null ? null : `${percent}%`;
  });

  /**
   * Hands the bar's width to the stylesheet as `--progress` on the host. A direct write, not a host
   * `style` binding, keeps the style-binding runtime out of the initial bundle.
   */
  ngOnChanges(): void {
    const width = this.width();
    if (width === null) this.host.nativeElement.style.removeProperty('--progress');
    else this.host.nativeElement.style.setProperty('--progress', width);
  }

  protected classes(): string {
    const tone = this.tone();
    return `progress${tone === 'default' ? '' : ` progress--${tone}`}${
      this.percent() === null ? ' progress--indeterminate' : ''
    }`;
  }
}
