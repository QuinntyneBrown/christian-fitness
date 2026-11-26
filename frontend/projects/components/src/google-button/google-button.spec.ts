import { TestBed } from '@angular/core/testing';
import { GoogleButton, type GoogleButtonLabel } from './google-button';

async function render(inputs: { label?: GoogleButtonLabel; busy?: boolean }) {
  const fixture = TestBed.createComponent(GoogleButton);
  for (const [key, value] of Object.entries(inputs))
    if (value !== undefined) fixture.componentRef.setInput(key, value);
  let chosen = 0;
  fixture.componentInstance.chosen.subscribe(() => chosen++);
  await fixture.whenStable();
  const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  return { button, chosen: () => chosen };
}

const text = (button: HTMLButtonElement) => button.textContent?.replace(/\s+/g, ' ').trim();

// docs/design-system/components/google-button.html; L2-049 AC9, AC10, L2-003 AC7, L2-004 AC7.
describe('GoogleButton', () => {
  // One row per wording: the bundled full-colour G, then Google's own words.
  it.each<{ label?: GoogleButtonLabel; reads: string }>([
    { reads: 'Continue with Google' },
    { label: 'Sign up with Google', reads: 'Sign up with Google' },
    { label: 'Try another Google account', reads: 'Try another Google account' },
  ])('reads "$reads" after the G', async ({ label, reads }) => {
    const { button } = await render({ label });

    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('class')).toBe('google-button');
    expect(text(button)).toBe(reads);
    expect(button.querySelector('svg.google-g')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.querySelectorAll('svg.google-g path')).toHaveLength(4);
    expect(button.querySelector('img')).toBeNull();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('a press emits chosen', async () => {
    const { button, chosen } = await render({});

    button.click();

    expect(chosen()).toBe(1);
  });

  it('busy reads "Opening Google…" with the spinner, disabled and aria-busy, and emits nothing', async () => {
    const { button, chosen } = await render({ busy: true });

    expect(text(button)).toBe('Opening Google…');
    expect(button.querySelector('svg.icon--spin')).not.toBeNull();
    expect(button.querySelector('svg.google-g')).toBeNull();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    button.click();
    expect(chosen()).toBe(0);
  });
});
