import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FEEDBACK_SERVICE, type FeedbackKind } from '@cf/api';
import {
  Alert,
  Button,
  Checkbox,
  ChoiceCardGroup,
  Container,
  ContextChip,
  Done,
  FileField,
  FormPage,
  Said,
  Textarea,
} from '@cf/components';
import {
  checkFeedbackNote,
  checkFeedbackScreenshot,
  FEEDBACK_KINDS,
  FEEDBACK_SCREENSHOT_TYPES,
  feedbackQuestionOf,
  feedbackRefusalOf,
  startingFeedbackKind,
  type FeedbackRefusal,
} from '@cf/domain';
import { HttpFeedbackService } from '../../services/http-feedback.service';
import { YOU_SAID_WE_DID } from './you-said-we-did';

/**
 * Send feedback at `/feedback` (L2-063; ADR 0109; mock `docs/mocks/pages/feedback/`): what it is
 * about as four choice cards, the page it is about as a chip the member can remove, a note whose
 * question follows the kind, and the email choice naming the member's address, beside "You said,
 * we did". The address says what the note is about (`about`) and, from a story, that it is a
 * correction (`kind`); the server gives the chip's label. An empty note is marked before anything
 * is sent, and Send feedback is never disabled for it. While the note is on its way the button
 * reads "Sending…" and the form holds still; "Got it. Thank you." then replaces it. A failure or
 * the hourly limit keeps everything written. Only "Something’s off" carries one screenshot,
 * checked by type and size before it is sent.
 */
@Component({
  selector: 'cf-feedback-page',
  imports: [
    Alert,
    Button,
    Checkbox,
    ChoiceCardGroup,
    Container,
    ContextChip,
    Done,
    FileField,
    FormPage,
    Said,
    Textarea,
  ],
  providers: [{ provide: FEEDBACK_SERVICE, useClass: HttpFeedbackService }],
  templateUrl: './feedback-page.html',
  styleUrl: './feedback-page.scss',
})
export default class FeedbackPage {
  private readonly document = inject(DOCUMENT);
  private readonly feedback = inject(FEEDBACK_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  protected readonly kinds = FEEDBACK_KINDS;
  protected readonly said = YOU_SAID_WE_DID;
  protected readonly kind = signal<FeedbackKind>('idea');
  protected readonly question = computed(() => feedbackQuestionOf(this.kind()));
  protected readonly text = signal('');
  protected readonly noteError = signal<string | null>(null);
  protected readonly mayEmail = signal(true);
  /** The member's address, once the server has said it. */
  protected readonly email = signal<string | null>(null);
  /** What the note is about, as the address named it, until the member removes it. */
  private readonly about = signal<string | null>(null);
  /** The label the server gave `about`; none when it did not know it or it was removed. */
  protected readonly aboutLabel = signal<string | null>(null);
  /** Writing, on its way, refused or failed (the form stays), or sent (the thanks replaces it). */
  protected readonly phase = signal<'editing' | 'sending' | 'failed' | 'sent'>('editing');
  protected readonly sending = computed(() => this.phase() === 'sending');
  /** Why the last send showed an alert, until the next. */
  protected readonly refusal = signal<'limit' | 'failed' | null>(null);
  /** Whether the note sent said the team may email; the thanks says how they will reply. */
  protected readonly sentMayEmail = signal(true);
  protected readonly screenshotTypes = FEEDBACK_SCREENSHOT_TYPES;
  /** The screenshot chosen, kept only while the kind is Something's off. */
  protected readonly screenshot = signal<File | null>(null);
  protected readonly screenshotError = signal<string | null>(null);
  protected readonly asksScreenshot = computed(() => this.kind() === 'problem');

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.start(params.get('about'), params.get('kind')));
  }

  /** A new form about `about`, as the address asks. */
  private start(about: string | null, kind: string | null): void {
    this.kind.set(startingFeedbackKind(kind, about));
    this.text.set('');
    this.noteError.set(null);
    this.mayEmail.set(true);
    this.removeScreenshot();
    this.refusal.set(null);
    this.phase.set('editing');
    this.about.set(about);
    this.aboutLabel.set(null);
    this.feedback
      .form(about)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (form) => {
          this.email.set(form.email);
          this.aboutLabel.set(form.about?.label ?? null);
          if (!form.about) this.about.set(null);
        },
      });
  }

  protected chooseKind(value: string): void {
    const kind = FEEDBACK_KINDS.find((option) => option.value === value)?.value;
    if (kind) this.kind.set(kind);
  }

  /** Keeps a screenshot the browser can tell is allowed; another is refused and never sent. */
  protected chooseScreenshot(file: File): void {
    const error = checkFeedbackScreenshot(file);
    this.screenshotError.set(error);
    this.screenshot.set(error === null ? file : null);
  }

  protected removeScreenshot(): void {
    this.screenshot.set(null);
    this.screenshotError.set(null);
  }

  protected edit(text: string): void {
    this.text.set(text);
    this.noteError.set(null);
  }

  /** Removes "About this page"; focus moves on to the note. */
  protected removeAbout(): void {
    this.about.set(null);
    this.aboutLabel.set(null);
    this.document.getElementById('f-text')?.focus();
  }

  protected send(): void {
    const error = checkFeedbackNote(this.text());
    this.noteError.set(error);
    if (error !== null) {
      this.focusNote();
      return;
    }
    if (this.sending()) return;
    this.refusal.set(null);
    this.phase.set('sending');
    this.feedback
      .send(
        {
          kind: this.kind(),
          text: this.text().trim(),
          about: this.about(),
          mayEmail: this.mayEmail(),
        },
        this.asksScreenshot() ? this.screenshot() : null,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sentMayEmail.set(this.mayEmail());
          this.phase.set('sent');
        },
        // What the member wrote stays, so they can send again.
        error: (failure: unknown) => this.refuse(feedbackRefusalOf(failure)),
      });
  }

  /**
   * Shows why the note was not sent: a sentence on the note or the screenshot, which takes focus, or an alert above
   * the form, which takes focus itself.
   */
  private refuse(refusal: FeedbackRefusal): void {
    this.phase.set('failed');
    if (refusal.kind === 'note') {
      this.noteError.set(refusal.message);
      this.focusNote();
      return;
    }
    if (refusal.kind === 'screenshot') {
      this.screenshotError.set(refusal.message);
      // The button is enabled again only once the form has rendered.
      afterNextRender(() => this.document.getElementById('f-screenshot')?.focus(), {
        injector: this.injector,
      });
      return;
    }
    this.refusal.set(refusal.kind);
  }

  /** Send more: a new, empty note about the same page. */
  protected more(): void {
    this.kind.set('idea');
    this.text.set('');
    this.noteError.set(null);
    this.mayEmail.set(true);
    this.removeScreenshot();
    this.refusal.set(null);
    this.phase.set('editing');
  }

  private focusNote(): void {
    this.document.getElementById('f-text')?.focus();
  }
}
