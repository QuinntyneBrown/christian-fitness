import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LISTING_SUGGESTIONS_SERVICE, type ListingKind, SESSION_SERVICE } from '@cf/api';
import {
  Alert,
  Button,
  Checkbox,
  ChoiceCardGroup,
  ChoiceChipGroup,
  Container,
  Done,
  FormPage,
  Link,
  type StepItem,
  Steps,
  Textarea,
  TextField,
} from '@cf/components';
import {
  checkSuggestion,
  clearSuggestionError,
  emptySuggestionForm,
  firstSuggestionFieldOf,
  SUGGESTION_KINDS,
  SUGGESTION_RELATIONS,
  type SuggestionField,
  type SuggestionFieldErrors,
  type SuggestionForm,
  suggestionFormOf,
  type SuggestionRefusal,
  suggestionRefusalOf,
  suggestionRequestOf,
  thanksOf,
} from '@cf/domain';
import { HttpListingSuggestionsService } from '../../services/http-listing-suggestions.service';

/** "What happens next", in order (L2-062 AC2; mock `suggest-listing/default`). */
const STEPS: readonly StepItem[] = [
  { title: 'We read it within 3 days', text: 'A real person on our team, not a filter.' },
  {
    title: 'We run four checks',
    text: 'Credentials, insurance where it applies, two references, and a conversation about faith and practice.',
  },
  {
    title: 'They approve their listing',
    text: 'Nothing goes live without the listed person or group saying yes.',
  },
  { title: 'You hear back', text: 'We message you when it’s approved, or tell you why not.' },
];

/**
 * Suggest a listing at `/directory/suggest` (L2-062; ADR 0086; mock
 * `docs/mocks/pages/suggest-listing/`): who is suggested as three choice cards, the kind as six
 * choice chips, the details, and "What happens next" beside the form. Myself changes the name and
 * reason labels and drops their email and the permission (`suggestionFormOf`). A blank name or
 * place is marked before anything is sent and focus moves to the first (`checkSuggestion`). The
 * "How we vet every listing" link waits for the publishing journeys (ADR 0086:
 * `vetting-unavailable`).
 */
@Component({
  selector: 'cf-suggest-listing-page',
  imports: [
    Alert,
    Button,
    Checkbox,
    ChoiceCardGroup,
    ChoiceChipGroup,
    Container,
    Done,
    FormPage,
    Link,
    Steps,
    Textarea,
    TextField,
  ],
  providers: [{ provide: LISTING_SUGGESTIONS_SERVICE, useClass: HttpListingSuggestionsService }],
  templateUrl: './suggest-listing-page.html',
  styleUrl: './suggest-listing-page.scss',
})
export default class SuggestListingPage {
  private readonly document = inject(DOCUMENT);
  private readonly suggestions = inject(LISTING_SUGGESTIONS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly relations = SUGGESTION_RELATIONS;
  protected readonly kinds = SUGGESTION_KINDS;
  protected readonly steps = STEPS;
  private readonly form = signal<SuggestionForm>(emptySuggestionForm());
  protected readonly values = this.form.asReadonly();
  protected readonly view = computed(() => suggestionFormOf(this.form().relation));
  protected readonly fieldErrors = signal<SuggestionFieldErrors>({});
  /** "Sent as" and the member's name, once the session has said who it is. */
  protected readonly sentAs = signal<string | null>(null);
  private readonly memberName = signal<string | null>(null);
  /** Typing, on its way, refused or failed (the form stays), or sent (the thanks replaces it). */
  protected readonly phase = signal<'editing' | 'sending' | 'failed' | 'sent'>('editing');
  /** Why the last send was refused or failed, until the next. */
  protected readonly refusal = signal<SuggestionRefusal['kind'] | null>(null);
  protected readonly sending = computed(() => this.phase() === 'sending');
  /** Whom the stored suggestion names, as the API answered it. */
  protected readonly suggested = signal('');
  protected readonly thanks = computed(() => thanksOf(this.memberName()));

  constructor() {
    inject(SESSION_SERVICE)
      .current()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (session) => {
          this.memberName.set(session.name);
          this.sentAs.set(`Sent as ${session.name}`);
        },
      });
  }

  protected chooseRelation(value: string): void {
    const relation = SUGGESTION_RELATIONS.find((option) => option.value === value)?.value;
    if (relation) this.form.update((form) => ({ ...form, relation }));
  }

  protected chooseKind(value: string): void {
    const kind: ListingKind | undefined = SUGGESTION_KINDS.find(
      (option) => option.value === value,
    )?.value;
    if (kind) this.form.update((form) => ({ ...form, kind }));
  }

  /** Keeps what the member typed in `field` and clears that field's mark. */
  protected edit(field: SuggestionField, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    this.fieldErrors.update((errors) => clearSuggestionError(errors, field));
  }

  protected allowTelling(allowed: boolean): void {
    this.form.update((form) => ({ ...form, mayTellWhoSuggested: allowed }));
  }

  protected send(): void {
    const errors = checkSuggestion(this.form());
    this.fieldErrors.set(errors);
    const first = firstSuggestionFieldOf(errors);
    if (first !== null) {
      this.document.getElementById(first)?.focus();
      return;
    }
    if (this.sending()) return;
    this.refusal.set(null);
    this.phase.set('sending');
    this.suggestions
      .suggest(suggestionRequestOf(this.form()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stored) => {
          this.suggested.set(stored.name);
          this.phase.set('sent');
        },
        // The form and everything typed stay, so the member can send again.
        error: (error: unknown) => this.refuse(suggestionRefusalOf(error)),
      });
  }

  /**
   * Shows why the send did not go through. A refused field is marked with its sentence and takes
   * focus once rendered; every other answer is an alert above the form, which takes focus itself.
   */
  private refuse(refusal: SuggestionRefusal): void {
    this.phase.set('failed');
    this.refusal.set(refusal.kind);
    if (refusal.kind !== 'invalid') return;
    this.fieldErrors.set(refusal.errors);
    const first = firstSuggestionFieldOf(refusal.errors);
    if (first !== null) this.document.getElementById(first)?.focus();
  }

  /** Suggest another: a new, empty form. */
  protected another(): void {
    this.form.set(emptySuggestionForm());
    this.fieldErrors.set({});
    this.suggested.set('');
    this.refusal.set(null);
    this.phase.set('editing');
  }
}
