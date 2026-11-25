import { booleanAttribute, Component, input, output } from '@angular/core';

let nextId = 0;

/**
 * The design system's form page (docs/design-system/components/form-layout.html, "Form page"): a
 * member form on its own screen with what happens next beside it. The main column is a `<form>`
 * with the page title, an optional lead, the alert projected with `slot="alert"`, the fields (the
 * default slot) and a foot with the actions (`slot="actions"`) and an optional "Sent as" line.
 * Once `done`, the form gives way to what is projected with `slot="done"`, the design system's
 * `done` block. The aside, named by its heading, holds what is projected with `slot="aside"`;
 * from 1024 px it sits beside the form, lowered to the fields. Submitting emits `send` and never
 * reloads the page. Every text is rendered as text.
 */
@Component({
  selector: 'cf-form-page',
  templateUrl: './form-page.html',
  styleUrl: './form-page.scss',
})
export class FormPage {
  readonly heading = input.required<string>();
  readonly lead = input<string>();
  /** Who the form is sent as, such as "Sent as Grace Thompson"; none to leave the line out. */
  readonly sentAs = input<string | null>(null);
  readonly asideHeading = input.required<string>();
  /** Replaces the form with the `done` slot. */
  readonly done = input(false, { transform: booleanAttribute });

  /** The member submitted the form. */
  readonly send = output<void>();

  protected readonly asideTitleId = `cf-form-page-aside-${nextId++}`;

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.send.emit();
  }
}
