import { TestBed } from '@angular/core/testing';
import { HostCard } from './host-card';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(HostCard);
  fixture.componentRef.setInput('href', '/directory/h1');
  fixture.componentRef.setInput('name', '<b>Danielle</b> Okafor');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  const emitted: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { root, emitted, link: root.querySelector('a.host-card') as HTMLAnchorElement };
}

function click(link: HTMLAnchorElement, init: MouseEventInit = {}): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  link.dispatchEvent(event);
  return event.defaultPrevented;
}

// L2-010 AC4 (ADR 0089): the host card names the host and its kind and leads to its listing.
describe('HostCard', () => {
  it('reads "Hosted by · <kind>", the name as text and the Verified mark when verified', async () => {
    const { root, link } = await render({ kind: 'Instructor', initials: 'DO', verified: true });

    expect(link.getAttribute('href')).toBe('/directory/h1');
    expect(root.querySelector('.host-card__label')?.textContent).toBe('Hosted by · Instructor');
    expect(root.querySelector('.host-card__name > span')?.textContent).toBe(
      '<b>Danielle</b> Okafor',
    );
    expect(root.querySelector('.host-card__name b')).toBeNull();
    const mark = root.querySelector('.verified-mark');
    expect(mark?.getAttribute('role')).toBe('img');
    expect(mark?.getAttribute('aria-label')).toBe('Verified');
    expect(root.querySelector('.listing-mark')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.host-card__arrow')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no Verified mark when not verified, and reads "Hosted by" with no kind', async () => {
    const { root } = await render({});

    expect(root.querySelector('.verified-mark')).toBeNull();
    expect(root.querySelector('.host-card__label')?.textContent).toBe('Hosted by');
  });

  it('hands a plain click to the screen and leaves a modified one to the browser', async () => {
    const { link, emitted } = await render({});

    expect(click(link)).toBe(true);
    expect(click(link, { metaKey: true })).toBe(false);
    expect(emitted).toEqual(['/directory/h1']);
  });
});
