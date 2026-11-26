import { TestBed } from '@angular/core/testing';
import { PickArt } from './pick-art';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(PickArt);
  fixture.componentRef.setInput('label', 'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('[role="img"]')!;
}

// L2-072 AC5 (pick-art): the graphic is one image named by its label, in its platform's shape.
describe('PickArt', () => {
  it('previews the graphic over the photo, its text as text', async () => {
    const art = await render({
      shape: 'story',
      title: '<i>Easter</i> Sunrise 5K',
      when: 'Sat Apr 18 · 6:45 AM · Waterfront',
      note: 'Flat and fast.',
      photoSrc: '/images/events/run.jpg',
    });

    expect(art.getAttribute('class')).toBe('pick-art pick-art--story');
    expect(art.getAttribute('aria-label')).toBe(
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );
    expect(art.querySelector('.pick-art__photo')?.getAttribute('src')).toBe(
      '/images/events/run.jpg',
    );
    expect(
      ['__label', '__title', '__when', '__note'].map(
        (part) => art.querySelector(`.pick-art${part}`)?.textContent,
      ),
    ).toEqual([
      'Community Pick',
      '<i>Easter</i> Sunrise 5K',
      'Sat Apr 18 · 6:45 AM · Waterfront',
      'Flat and fast.',
    ]);
    expect(art.querySelector('i')).toBeNull();
  });

  it('draws the brand pattern for an event with no photo', async () => {
    const art = await render({ title: 'Easter Sunrise 5K' });

    expect(art.getAttribute('class')).toBe('pick-art pick-art--square pick-art--pattern');
    expect(art.querySelector('.pick-art__pattern')).not.toBeNull();
    expect(art.querySelector('img')).toBeNull();
  });

  it('shows the rendered PNG alone once made', async () => {
    const art = await render({ shape: 'landscape', rendered: 'blob:x', title: 'Easter' });

    expect(art.getAttribute('class')).toBe('pick-art pick-art--landscape');
    expect(art.querySelector('img')?.getAttribute('src')).toBe('blob:x');
    expect(art.querySelector('.pick-art__title')).toBeNull();
  });
});
