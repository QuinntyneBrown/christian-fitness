import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ListingKind, SESSION_SERVICE } from '@cf/api';
import {
  Button,
  Checkbox,
  ChoiceCardGroup,
  ChoiceChipGroup,
  Container,
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
} from '@cf/domain';

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
 * Suggest a listing at `/directory/suggest` (L2-062; ADR 0084; mock
 * `docs/mocks/pages/suggest-listing/`): who is suggested as three choice cards, the kind as six
 * choice chips, the details, and "What happens next" beside the form. Myself changes the name and
 * reason labels and drops their email and the permission (`suggestionFormOf`). A blank name or
 * place is marked before anything is sent and focus moves to the first (`checkSuggestion`). The
 * "How we vet every listing" link waits for the publishing journeys (ADR 0084:
 * `vetting-unavailable`).
 */
@Component({
  selector: 'cf-suggest-listing-page',
  imports: [
    Button,
    Checkbox,
    ChoiceCardGroup,
    ChoiceChipGroup,
    Container,
    FormPage,
    Link,
    Steps,
    Textarea,
    TextField,
  ],
  templateUrl: './suggest-listing-page.html',
  styleUrl: './suggest-listing-page.scss',
})
export default class SuggestListingPage {
  private readonly document = inject(DOCUMENT);

  protected readonly relations = SUGGESTION_RELATIONS;
  protected readonly kinds = SUGGESTION_KINDS;
  protected readonly steps = STEPS;
  private readonly form = signal<SuggestionForm>(emptySuggestionForm());
  protected readonly values = this.form.asReadonly();
  protected readonly view = computed(() => suggestionFormOf(this.form().relation));
  protected readonly fieldErrors = signal<SuggestionFieldErrors>({});
  /** "Sent as" and the member's name, once the session has said who it is. */
  protected readonly sentAs = signal<string | null>(null);

  constructor() {
    inject(SESSION_SERVICE)
      .current()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (session) => this.sentAs.set(`Sent as ${session.name}`) });
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
  }
}
