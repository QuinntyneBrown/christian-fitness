import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FEEDBACK_SERVICE, type FeedbackKind } from '@cf/api';
import {
  Button,
  Checkbox,
  ChoiceCardGroup,
  Container,
  ContextChip,
  FormPage,
  Said,
  Textarea,
} from '@cf/components';
import {
  checkFeedbackNote,
  FEEDBACK_KINDS,
  feedbackQuestionOf,
  startingFeedbackKind,
} from '@cf/domain';
import { HttpFeedbackService } from '../../services/http-feedback.service';
import { YOU_SAID_WE_DID } from './you-said-we-did';

/**
 * Send feedback at `/feedback` (L2-063; ADR 0109; mock `docs/mocks/pages/feedback/`): what it is
 * about as four choice cards, the page it is about as a chip the member can remove, a note whose
 * question follows the kind, and the email choice naming the member's address, beside "You said,
 * we did". The address says what the note is about (`about`) and, from a story, that it is a
 * correction (`kind`); the server gives the chip's label. An empty note is marked before anything
 * is sent, and Send feedback is never disabled for it.
 */
@Component({
  selector: 'cf-feedback-page',
  imports: [Button, Checkbox, ChoiceCardGroup, Container, ContextChip, FormPage, Said, Textarea],
  providers: [{ provide: FEEDBACK_SERVICE, useClass: HttpFeedbackService }],
  templateUrl: './feedback-page.html',
  styleUrl: './feedback-page.scss',
})
export default class FeedbackPage {
  private readonly document = inject(DOCUMENT);
  private readonly feedback = inject(FEEDBACK_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

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
      this.document.getElementById('f-text')?.focus();
      return;
    }
  }
}
