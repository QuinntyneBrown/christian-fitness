import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { nextMenuIndex } from './menu-keys';

/** One action, or one option of a choice menu. */
export interface MenuItem {
  id: string;
  label: string;
  /** A destructive action, shown last in the danger colour. */
  danger?: boolean;
  /** Unavailable: still focusable, announced with `aria-disabled`, does nothing. */
  disabled?: boolean;
  /** The chosen option of a choice menu. */
  checked?: boolean;
  /** A trailing shortcut hint. */
  shortcut?: string;
}

/** A group of items, split from the next by a hairline, with an optional overline heading. */
export interface MenuSection {
  heading?: string;
  items: readonly MenuItem[];
}

/** An action menu runs actions; a choice menu picks one option (`menuitemradio`). */
export type MenuKind = 'action' | 'choice';

let nextId = 0;

/**
 * The design system's menu button and menu (docs/design-system/components/menu.html), following
 * the APG menu button. The trigger has `aria-haspopup="menu"`, `aria-expanded` and
 * `aria-controls`; the menu is labelled by it. Enter, Space or ↓ on the trigger open the menu on
 * its first item and ↑ on its last; ↓/↑ move and wrap, Home and End jump, Enter or Space activate
 * and close, Escape closes and returns focus to the trigger, Tab closes and lets focus move on, and
 * a tap outside closes. Items keep a roving `tabindex`. Activating an item emits `selected` with
 * its id; an unavailable item does nothing. Labels are rendered as text.
 */
@Component({
  selector: 'cf-menu',
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  host: { '(document:pointerdown)': 'pointerDown($event)' },
})
export class Menu {
  /** The trigger's label, which names the set; for an icon-only trigger, its accessible name. */
  readonly label = input.required<string>();
  readonly sections = input.required<readonly MenuSection[]>();
  readonly kind = input<MenuKind>('action');
  /** A round icon trigger, named by `label` ("Actions for Saturday run"). */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly active = signal(0);
  protected readonly triggerId = `cf-menu-trigger-${nextId}`;
  protected readonly menuId = `cf-menu-${nextId++}`;

  /** Every item in order, with its position across sections. */
  protected readonly items = computed(() => this.sections().flatMap((section) => section.items));

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  protected indexOf(item: MenuItem): number {
    return this.items().indexOf(item);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else {
      this.show(0);
    }
  }

  protected triggerKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.show(event.key === 'ArrowDown' ? 0 : this.items().length - 1);
    }
  }

  protected itemKey(event: KeyboardEvent, item: MenuItem): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      // Handled here, so the browser's own click on the button does not run it twice.
      event.preventDefault();
      this.activate(item);
      return;
    }
    const next = nextMenuIndex(event.key, this.active(), this.items().length);
    if (next !== null) {
      event.preventDefault();
      this.active.set(next);
      this.focusItem(next);
    }
  }

  protected activate(item: MenuItem): void {
    if (item.disabled) {
      return;
    }
    this.close(true);
    this.selected.emit(item.id);
  }

  protected pointerDown(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  private show(index: number): void {
    this.active.set(index);
    this.open.set(true);
    // The menu is hidden until this render; focus its item once it is shown.
    afterNextRender(() => this.focusItem(index), { injector: this.injector });
  }

  private close(returnFocus: boolean): void {
    this.open.set(false);
    if (returnFocus) {
      this.host.nativeElement.querySelector<HTMLElement>('.menu__trigger')?.focus();
    }
  }

  private focusItem(index: number): void {
    this.host.nativeElement.querySelectorAll<HTMLElement>('.menu__item')[index]?.focus();
  }
}
