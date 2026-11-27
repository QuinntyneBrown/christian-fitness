import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { ADMIN_NEWSLETTER_SERVICE } from '@cf/api';
import {
  Button,
  ButtonRow,
  Card,
  EmptyState,
  Interest,
  InterestList,
  PickRows,
  type PickRowToggle,
  Select,
  type SelectOption,
  SendCard,
  Skeleton,
  SkeletonRegion,
  Status,
  Table,
  type TableColumn,
  type TableRow,
  Textarea,
  TextField,
} from '@cf/components';
import {
  alsoCount,
  alsoRowsOf,
  IssueBuilder,
  issueFieldError,
  issueSavedText,
  issueSubtitle,
  sendCardOf,
  sentIssueRowsOf,
} from '@cf/domain';
import { HttpAdminNewsletterService } from '../../services/http-admin-newsletter.service';

/** The fields Schedule can refuse, in the order they are drawn, with the input each one's error hangs off. */
const FIELD_INPUTS: readonly (readonly [string, string])[] = [
  ['subject', 'f-subject'],
  ['editorsNote', 'f-note'],
  ['leadStoryId', 'f-lead'],
  ['verse', 'f-verse'],
  ['verseReference', 'f-reference'],
  ['sendTime', 'f-resend'],
];

/**
 * The Newsletter desk (mock docs/mocks/pages/admin-newsletter/; L2-070): the newsletter's name,
 * confirmed subscribers and cadence; the next issue with its Subject line, Editor's note, The big
 * story, Also this week ("<n> of 3"), Events this week and a Verse to carry; the send card with
 * Schedule issue, Unschedule to edit or, for a missed issue, a time later today; Preview and Send
 * me a test; and the sent issues. A Draft saves itself 2 seconds after typing stops. While it
 * loads, skeletons; when it does not, the error state with Try again. A Moderator uses it as an
 * Admin does. Its store and service are this screen's own (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-newsletter-desk-page',
  imports: [
    Button,
    ButtonRow,
    Card,
    EmptyState,
    Interest,
    InterestList,
    PickRows,
    Select,
    SendCard,
    Skeleton,
    SkeletonRegion,
    Status,
    Table,
    Textarea,
    TextField,
  ],
  templateUrl: './newsletter-desk-page.html',
  styleUrl: './newsletter-desk-page.scss',
  providers: [
    { provide: ADMIN_NEWSLETTER_SERVICE, useClass: HttpAdminNewsletterService },
    IssueBuilder,
  ],
})
export default class NewsletterDeskPage {
  protected readonly builder = inject(IssueBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  /** The clock the stories' ages are worded against: read once, when the screen opens. */
  private readonly now = signal(new Date());

  protected readonly sentColumns: readonly TableColumn[] = [
    { key: 'issue', label: 'Issue', kind: 'custom' },
    { key: 'subject', label: 'Subject' },
    { key: 'recipients', label: 'Sent to', end: true },
  ];

  protected readonly subtitle = computed(() => {
    const desk = this.builder.desk();
    return desk
      ? issueSubtitle(desk.name, desk.confirmedSubscribers)
      : 'The Abundant Weekly · Every Saturday, 7 AM';
  });
  protected readonly issue = this.builder.issue;
  protected readonly fields = this.builder.fields;
  protected readonly locked = computed(() => this.builder.locked());
  protected readonly scheduled = computed(() => this.issue()?.status === 'scheduled');
  protected readonly leadOptions = computed((): SelectOption[] =>
    (this.builder.desk()?.stories ?? []).map((story) => ({
      value: story.id,
      label: story.headline,
    })),
  );
  protected readonly alsoRows = computed(() =>
    alsoRowsOf(this.builder.desk()?.stories ?? [], this.fields(), this.now()),
  );
  protected readonly alsoCount = computed(() => alsoCount(this.fields().alsoStoryIds));
  protected readonly events = computed(() =>
    (this.builder.desk()?.events ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      pressed: this.fields().eventIds.includes(event.id),
    })),
  );
  protected readonly sendCard = computed(() => {
    const issue = this.issue();
    const desk = this.builder.desk();
    return issue && desk ? sendCardOf(issue, desk.confirmedSubscribers) : null;
  });
  /** "Saving…", "Saved 8:42 AM", or nothing before the first save (mocks autosaving, default). */
  protected readonly saved = computed(() =>
    this.builder.saving() ? 'Saving…' : issueSavedText(this.builder.savedAt()),
  );
  protected readonly sentRows = computed((): TableRow[] =>
    sentIssueRowsOf(this.builder.desk()?.sent ?? []).map((row) => ({
      id: row.id,
      name: row.number,
      cells: {
        issue: { text: row.number },
        subject: { text: row.subject },
        recipients: { text: row.recipients },
      },
    })),
  );
  /** Each sent issue's date, "Apr 11", by its row's id: drawn beside the number in the Issue cell. */
  protected readonly sentDates = computed(
    () =>
      new Map(sentIssueRowsOf(this.builder.desk()?.sent ?? []).map((row) => [row.id, row.date])),
  );
  protected readonly testStatus = computed(() =>
    this.builder.test() === 'sent' ? `Test sent to ${this.builder.testSentTo() ?? ''}` : '',
  );

  constructor() {
    this.builder.open();
  }

  protected errorOf(field: string): string | null {
    return issueFieldError(this.builder.fieldCodes()[field]);
  }

  protected toggleAlso(toggle: PickRowToggle): void {
    this.builder.toggleAlso(toggle.id, toggle.checked);
  }

  /** Schedule issue, or Reschedule for a missed one; a refusal moves focus to the first field it marks. */
  protected schedule(event: Event): void {
    event.preventDefault();
    this.builder.schedule();
    const codes = this.builder.fieldCodes();
    const first = FIELD_INPUTS.find(([field]) => field in codes);
    if (!first) return;
    afterNextRender(() => this.document.getElementById(first[1])?.focus(), {
      injector: this.injector,
    });
  }
}
