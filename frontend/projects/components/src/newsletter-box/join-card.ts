import { Component, input } from '@angular/core';
import { Button } from '../button/button';

/**
 * The design system's join card (docs/design-system/components/newsletter-box.html, block
 * `join-card`): the bordeaux panel at the top of the news rail, with the community's headline,
 * one sentence on what it is and the white button that leads to Join. Words are rendered as text.
 */
@Component({
  selector: 'cf-join-card',
  imports: [Button],
  templateUrl: './join-card.html',
  styleUrl: './join-card.scss',
})
export class JoinCard {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly action = input('Join the community');
  readonly href = input('/join');
}
