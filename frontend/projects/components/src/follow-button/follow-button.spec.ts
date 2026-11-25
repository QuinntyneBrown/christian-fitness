import { TestBed } from '@angular/core/testing';
import { FollowButton } from './follow-button';

async function render(inputs: { following?: boolean; busy?: boolean; large?: boolean }) {
  const fixture = TestBed.createComponent(FollowButton);
  fixture.componentRef.setInput('name', 'Faith & <b>Footwork</b>');
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  let toggled = 0;
  fixture.componentInstance.toggled.subscribe(() => toggled++);
  await fixture.whenStable();
  const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  return { button, toggled: () => toggled };
}

// docs/design-system/components/follow-button.html; L2-056 AC1 and AC8 (ADR 0088).
describe('FollowButton', () => {
  // One row per state: the label stays "Follow"; pressed adds the check mark; the name is text.
  it.each([
    { following: false, pressed: 'false', check: false },
    { following: true, pressed: 'true', check: true },
  ])(
    'reads "Follow" with the listing’s name, pressed $pressed',
    async ({ following, pressed, check }) => {
      const { button } = await render({ following });

      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('aria-pressed')).toBe(pressed);
      expect(button.querySelector('svg.icon') !== null).toBe(check);
      expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Follow Faith & <b>Footwork</b>',
      );
      expect(button.querySelector('b')).toBeNull();
      expect(button.querySelector('.visually-hidden')?.textContent).toBe(
        ' Faith & <b>Footwork</b>',
      );
    },
  );

  it('is the row size, or the profile head’s with large', async () => {
    expect((await render({})).button.getAttribute('class')).toBe('follow');
    expect((await render({ large: true })).button.getAttribute('class')).toBe('follow follow--lg');
  });

  it('emits toggled on a press', async () => {
    const { button, toggled } = await render({});

    button.click();

    expect(toggled()).toBe(1);
  });

  it('is aria-disabled while busy, and a press emits nothing', async () => {
    const { button, toggled } = await render({ following: true, busy: true });

    button.click();

    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    expect(toggled()).toBe(0);
  });
});
