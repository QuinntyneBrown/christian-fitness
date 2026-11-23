import { Component } from '@angular/core';

/**
 * The design system's accordion (docs/design-system/components/accordion.html): independent
 * sections people scan by heading, between a top and a bottom rule. It groups the projected
 * `cf-accordion-item`s; opening one never closes another.
 */
@Component({
  selector: 'cf-accordion',
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
})
export class Accordion {}
