import { TestBed } from '@angular/core/testing';
import { ReviewCard } from './review-card';

async function render() {
  const fixture = TestBed.createComponent(ReviewCard);
  fixture.componentRef.setInput('href', '/stories/42');
  fixture.componentRef.setInput('label', 'Waiting for your review · Submitted 1 hour ago');
  fixture.componentRef.setInput('title', '<b>Fasting</b>');
  fixture.componentRef.setInput('meta', 'Priya Raman · Nutrition');
  await fixture.whenStable();
  const followed: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => followed.push(href));
  const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a')!;
  return { link, followed };
}

describe('ReviewCard', () => {
  it('is one link holding the label, the title as text, the meta and the action', async () => {
    const { link } = await render();

    expect(link.getAttribute('href')).toBe('/stories/42');
    expect(link.querySelector('.review-card__title')?.textContent).toBe('<b>Fasting</b>');
    expect(link.querySelectorAll('a, button')).toHaveLength(0);
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Waiting for your review · Submitted 1 hour ago<b>Fasting</b>Priya Raman · NutritionReview',
    );
  });

  it('hands a plain click to the screen and leaves a modified click to the browser', async () => {
    const { link, followed } = await render();

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(modified);

    expect([plain.defaultPrevented, modified.defaultPrevented, followed]).toEqual([
      true,
      false,
      ['/stories/42'],
    ]);
  });
});
