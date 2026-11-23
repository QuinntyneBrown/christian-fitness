import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState, type EmptyStateVariant } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <cf-empty-state heading="No events yet" text="The team posts runs every week.">
      <a slot="actions" class="host-action" href="/events">Browse events</a>
    </cf-empty-state>
  `,
})
class Host {}

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(EmptyState);
  const all = { heading: 'Members didn’t load', text: 'We couldn’t reach the server.', ...inputs };
  for (const [name, value] of Object.entries(all)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('EmptyState', () => {
  // One row per kind (empty-state.html, "Overview"): only a load error is announced, once.
  it.each<[EmptyStateVariant, string | null]>([
    ['page', null],
    ['tight', null],
    ['card', null],
    ['inline', null],
    ['error', 'alert'],
  ])('a %s block has role %s', async (variant, role) => {
    const el = await render({ variant });

    expect(el.firstElementChild?.getAttribute('role') ?? null).toBe(role);
    expect(el.textContent).toContain('We couldn’t reach the server.');
  });

  it('titles the block with a real heading, or a paragraph when it restates a filter result', async () => {
    const heading = await render({ variant: 'page' });
    expect(heading.querySelector('h2')?.textContent).toBe('Members didn’t load');

    const restated = await render({
      variant: 'tight',
      headingTag: 'p',
      heading: 'No members match “Jessica”',
    });
    expect(restated.querySelector('h2')).toBeNull();
    expect(restated.querySelector('p')?.textContent).toBe('No members match “Jessica”');
  });

  it('gives a load error a reference people can quote to support, as plain text', async () => {
    const el = await render({ variant: 'error', reference: 'CF-A2E4' });

    expect(el.querySelector('.error-state__ref')?.textContent).toBe('Reference CF-A2E4');
  });

  it('shows the actions the screen projects', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('.empty-state__actions .host-action'),
    ).not.toBeNull();
  });
});
