import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Status, type StatusVariant } from '../badge/status';
import type { FeedbackRowKind } from './feedback-row';

/** How the note's status badge is drawn. */
export type FeedbackDetailStatus = 'new' | 'replied' | 'resolved';

/**
 * The design system's feedback detail (docs/design-system/components/feedback-row.html, block
 * `feedback-detail` with `kind-tag`): the chosen note's kind, status and when it was sent; its full
 * text; who sent it, with their email and a "Suspended" label where it applies; the page it was
 * sent from and the device. Its heading, hidden, names the note ("Correction from Adaeze Kalu").
 * What follows (the screenshot, a link to the story, the replies kept, the reply box and its
 * actions) is projected. Every text is rendered as text, never as HTML (L2-074 AC8).
 */
@Component({
  selector: 'cf-feedback-detail',
  imports: [Avatar, Status],
  templateUrl: './feedback-detail.html',
  styleUrl: './feedback-detail.scss',
})
export class FeedbackDetail {
  readonly kind = input.required<FeedbackRowKind>();
  /** The kind's name: "Something’s off". */
  readonly kindLabel = input.required<string>();
  readonly status = input.required<FeedbackDetailStatus>();
  /** The status in words: "New". */
  readonly statusLabel = input.required<string>();
  readonly when = input.required<string>();
  readonly text = input.required<string>();
  readonly fromName = input.required<string>();
  readonly fromEmail = input.required<string>();
  /** The sender's initials, for the avatar. */
  readonly initials = input('');
  readonly suspended = input(false, { transform: booleanAttribute });
  /** "Events › Easter Sunrise 5K". */
  readonly sentFrom = input.required<string>();
  /** "iOS · Safari 18". */
  readonly device = input.required<string>();

  /** The badge of each status (components.css: New as review, Replied as scheduled, Resolved as draft). */
  protected readonly statusVariant = computed((): StatusVariant => {
    const status = this.status();
    return status === 'new' ? 'review' : status === 'replied' ? 'scheduled' : 'draft';
  });
}
