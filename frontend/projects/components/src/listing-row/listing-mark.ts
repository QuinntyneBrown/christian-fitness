import { booleanAttribute, Component, computed, input, signal } from '@angular/core';

/** The listing mark's sizes: `sm` (40 px), the default `md` (48 px, rows) and `xl` (112 px, the profile head). */
export type ListingMarkSize = 'sm' | 'md' | 'xl';

/**
 * The design system's listing mark (docs/design-system/components/listing-row.html, block
 * `listing-mark`): a listing's picture. Organizations, companies and ministries are initials on a
 * dark rounded square; people (`person`) are round, a photo or blush initials. Always decorative,
 * since the name follows it: initials are `aria-hidden` and a photo has an empty `alt`. A photo
 * that fails to load is replaced by the initials, and a new `photoSrc` is tried again.
 */
@Component({
  selector: 'cf-listing-mark',
  templateUrl: './listing-mark.html',
  styleUrl: './listing-mark.scss',
})
export class ListingMark {
  readonly initials = input('');
  readonly photoSrc = input<string | null>(null);
  readonly person = input(false, { transform: booleanAttribute });
  readonly size = input<ListingMarkSize>('md');

  private readonly failed = signal<string | null>(null);

  protected readonly photo = computed(() => {
    const src = this.photoSrc();
    return src !== null && src !== this.failed() ? src : null;
  });

  protected readonly classes = computed(() => {
    const size = this.size();
    return [
      'listing-mark',
      this.person() ? 'listing-mark--person' : '',
      size === 'md' ? '' : `listing-mark--${size}`,
    ]
      .filter(Boolean)
      .join(' ');
  });

  protected onError(src: string): void {
    this.failed.set(src);
  }
}
