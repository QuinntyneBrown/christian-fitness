import { Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Card } from '../card/card';
import { PickArt } from './pick-art';

/**
 * The design system's Slack preview (docs/design-system/components/pick-art.html, block
 * `slack-preview`): the post as a channel shows it, from Christian Fitness at `time`, with
 * "Community Pick:" and the title as a link, the note (left out when blank), the details line, and
 * the unfurl naming the site above the graphic made (`src`, a PNG's object URL). Every text is
 * text (L2-072 AC4).
 */
@Component({
  selector: 'cf-slack-preview',
  imports: [Avatar, Card, PickArt],
  templateUrl: './slack-preview.html',
  styleUrl: './slack-preview.scss',
})
export class SlackPreview {
  /** "9:02 AM". */
  readonly time = input.required<string>();
  readonly title = input.required<string>();
  readonly note = input('');
  /** "Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free". */
  readonly details = input.required<string>();
  /** "www.christian.fitness". */
  readonly site = input.required<string>();
  /** The graphic's name for assistive technology. */
  readonly artLabel = input.required<string>();
  readonly src = input.required<string>();
}
