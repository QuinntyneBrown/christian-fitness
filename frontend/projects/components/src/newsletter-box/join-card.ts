import { Component, input } from '@angular/core';
import { Button } from '../button/button';

/**
 * The design system's join card (docs/design-system/components/newsletter-box.html, block
 * `join-card`): the rail's call to join on a brand panel, "Life to the full.", the community in
 * one sentence and "Join the community" leading to Join (L2-001 AC5). The member count the mock
 * draws is left out until a requirement states it (ADR 0037, ADR 0107).
 */
@Component({
  selector: 'cf-join-card',
  imports: [Button],
  templateUrl: './join-card.html',
  styleUrl: './join-card.scss',
})
export class JoinCard {
  readonly joinHref = input('/join');
}
