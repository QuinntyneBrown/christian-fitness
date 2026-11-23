import { Component, input } from '@angular/core';

/**
 * The stack's gaps (layout.html, "Sizes"): `sm` 8 px, `default` 16 px, `section` 20 px (the
 * page's `stack-5`), `lg` 32 px and `aside` 40 px between an aside's panels (`aside-stack`).
 */
export type StackGap = 'sm' | 'default' | 'section' | 'lg' | 'aside';

/**
 * The design system's stack (docs/design-system/components/layout.html, "Stack"): its children in
 * one column with an even gap, in DOM order. It is not a landmark; an aside's `aria-label` goes on
 * the screen's own `aside` around it.
 */
@Component({
  selector: 'cf-stack',
  templateUrl: './stack.html',
  styleUrl: './stack.scss',
})
export class Stack {
  readonly gap = input<StackGap>('default');

  protected classes(): string {
    const gap = this.gap();
    return gap === 'default' ? 'stack' : `stack stack--${gap}`;
  }
}
