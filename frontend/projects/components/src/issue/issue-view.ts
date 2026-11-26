import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Seal } from '../brand-lockup/seal';
import { isPlainClick } from '../link/plain-click';
import { EventRow } from '../list/event-row';
import { HeadlineList } from '../story/headline-list';
import type { NewsStoryView } from '../story/story-lead';

/** The big story as an issue shows it. */
export interface IssueLeadView {
  /** "The big story · Community". */
  section: string;
  title: string;
  summary: string;
  /** The image's address, or none. */
  image: string | null;
  href: string;
}

/** One row of "On the calendar". */
export interface IssueEventView {
  id: string;
  month: string;
  day: string;
  title: string;
  /** "Sat 6:45 AM · Waterfront · Free". */
  meta: string;
}

/** An issue in words, ready to draw. */
export interface IssueViewModel {
  /** "The Abundant Weekly". */
  name: string;
  /** "No. 48 · Saturday, April 11, 2026". */
  date: string;
  /** "Morning, Grace." for a signed-in member; none otherwise (L2-059 AC2). */
  greeting: string | null;
  editorsNote: string;
  lead: IssueLeadView | null;
  events: readonly IssueEventView[];
  briefs: readonly NewsStoryView[];
  verse: string;
  verseReference: string;
}

/**
 * The design system's issue (docs/design-system/components/issue.html, block `issue`): one
 * `article` that reads as the email does. Its one `h1` is the newsletter's name; then the editor's
 * note, the big story with "Read the story", "On the calendar" (event rows that are not links),
 * "Worth your time" (the headline list, plain, its titles `h3`), the verse and the footer, whose
 * links lead to Subscribe: only a subscriber's own email unsubscribes (L2-059 AC3). A section
 * with nothing in it is left out. A plain click on a link inside the app emits `navigate`. Every
 * value is rendered as text.
 */
@Component({
  selector: 'cf-issue-view',
  imports: [Button, EventRow, HeadlineList, Seal],
  templateUrl: './issue-view.html',
  styleUrl: './issue-view.scss',
})
export class IssueView {
  readonly issue = input.required<IssueViewModel>();
  /** Where "See every event" leads. */
  readonly eventsHref = input('/');

  /** A plain click on a link inside the app, with its address. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
