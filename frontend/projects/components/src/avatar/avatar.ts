import { booleanAttribute, Component, computed, input, signal } from '@angular/core';
import { initialsOf } from './initials';

/** The design system's avatar sizes: `lg` (48 px, rows) is the default. */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * The design system's avatar looks: initials on the accent tint, `group` (a rounded square in
 * inverse colours, for event group chats) and `solid` (bordeaux, the signed-in person's own).
 */
export type AvatarVariant = 'default' | 'group' | 'solid';

/**
 * The design system's avatar (docs/design-system/components/avatar.html): a face or initials
 * beside a name. Always decorative, because the name beside it carries the meaning: initials are
 * `aria-hidden` and a photo has empty `alt`. It shows the photo at `src`; a photo that fails to
 * load is replaced by the initials of `name` (or the given `initials`), never a broken image, and
 * a new `src` is tried again. Never focusable; the row or button around it owns the state.
 */
@Component({
  selector: 'cf-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  /** The person or group the avatar stands for; it gives the initials. */
  readonly name = input.required<string>();
  /** Initials to show in place of the name's, such as a group chat's "5K". */
  readonly initials = input<string>();
  readonly src = input<string>();
  readonly size = input<AvatarSize>('lg');
  readonly variant = input<AvatarVariant>('default');
  /** A square photo (`avatar--photo-square`) instead of a circle. */
  readonly square = input(false, { transform: booleanAttribute });

  /** The photo that failed to load, so a new one is tried again. */
  private readonly failed = signal<string | undefined>(undefined);

  protected readonly photo = computed(() => {
    const src = this.src();
    return src && src !== this.failed() ? src : undefined;
  });

  protected readonly letters = computed(() => this.initials() ?? initialsOf(this.name()));

  protected classes(): string {
    const size = this.size();
    const variant = this.variant();
    return `avatar${size === 'lg' ? '' : ` avatar--${size}`}${
      variant === 'default' ? '' : ` avatar--${variant}`
    }${this.square() ? ' avatar--photo-square' : ''}`;
  }

  protected onError(): void {
    this.failed.set(this.src());
  }
}
