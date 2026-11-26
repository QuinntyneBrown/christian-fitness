import { TestBed } from '@angular/core/testing';
import { PickAsset } from './pick-asset';

// L2-072 AC4, AC7 (pick-art, asset): one graphic as made, its size and a PNG button naming the file.
describe('PickAsset', () => {
  it('shows the PNG made in its shape, its size, and a PNG button that names the file', async () => {
    const fixture = TestBed.createComponent(PickAsset);
    fixture.componentRef.setInput('shape', 'story');
    fixture.componentRef.setInput(
      'artLabel',
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );
    fixture.componentRef.setInput('src', 'blob:http://localhost/made');
    fixture.componentRef.setInput('label', 'Story · 1080 × 1920');
    fixture.componentRef.setInput(
      'fileName',
      'community-pick-easter-sunrise-5k-instagram-story.png',
    );
    let saved = 0;
    fixture.componentInstance.save.subscribe(() => saved++);
    await fixture.whenStable();
    const figure = (fixture.nativeElement as HTMLElement).querySelector('figure.asset')!;

    expect(figure.querySelector('.pick-art')?.getAttribute('class')).toBe(
      'pick-art pick-art--story',
    );
    expect(figure.querySelector('.pick-art img')?.getAttribute('src')).toBe(
      'blob:http://localhost/made',
    );
    expect(figure.querySelector('.asset__label')?.textContent).toBe('Story · 1080 × 1920');
    const button = figure.querySelector('button')!;
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'PNG: community-pick-easter-sunrise-5k-instagram-story.png',
    );
    expect(button.querySelector('.visually-hidden')?.textContent).toBe(
      ': community-pick-easter-sunrise-5k-instagram-story.png',
    );

    button.click();

    expect(saved).toBe(1);
  });
});
