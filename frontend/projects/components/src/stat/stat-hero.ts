import { Component, input } from '@angular/core';

/**
 * The design system's stat hero (docs/design-system/components/stat.html, "Stat hero"): one
 * headline number on a bordeaux panel, with its label and a change over a named period. Text in a
 * section the screen heads; read-only and never counting up. Words are rendered as text.
 */
@Component({
  selector: 'cf-stat-hero',
  templateUrl: './stat-hero.html',
  styleUrl: './stat-hero.scss',
})
export class StatHero {
  readonly label = input.required<string>();
  /** The figure with its thousands separator, such as "2,431". */
  readonly value = input.required<string>();
  /** The change over a named period, such as "+86 joined in April". */
  readonly sub = input<string>();
}
