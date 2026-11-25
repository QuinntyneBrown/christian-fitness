import { TestBed } from '@angular/core/testing';
import { ServiceDetail } from './service-detail';

async function card(directoryHref: string) {
  const fixture = TestBed.createComponent(ServiceDetail);
  fixture.componentRef.setInput('name', 'Danielle Okafor');
  fixture.componentRef.setInput('directoryHref', directoryHref);
  const emitted: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const link = Array.from(root.querySelectorAll('a')).find(
    (a) => a.textContent?.trim() === 'Also in the directory',
  );
  return { emitted, link };
}

function click(link: HTMLAnchorElement, init: MouseEventInit = {}): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  link.dispatchEvent(event);
  return event.defaultPrevented;
}

// ADR 0061 and ADR 0087: "Also in the directory" leads to the professional's directory listing,
// routed by the screen on a plain click, and is not there without one.
describe('ServiceDetail, Also in the directory', () => {
  it('links to the directory listing and hands a plain click to the screen', async () => {
    const { emitted, link } = await card('/directory/l-1');

    expect(link?.getAttribute('href')).toBe('/directory/l-1');
    expect(click(link!)).toBe(true);
    expect(emitted).toEqual(['/directory/l-1']);
  });

  it('leaves a modified click to the browser', async () => {
    const { emitted, link } = await card('/directory/l-1');

    expect(click(link!, { ctrlKey: true })).toBe(false);
    expect(emitted).toEqual([]);
  });

  it('is not there without a directory listing', async () => {
    expect((await card('')).link).toBeUndefined();
  });
});
