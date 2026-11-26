import { TestBed } from '@angular/core/testing';
import { PickCaption } from './pick-caption';

// L2-072 AC6, AC7 (pick-art, caption): the caption as text, its hint, Copy and "Copied".
describe('PickCaption', () => {
  it('shows the text as text with its hint, and Copy emits copyCaption', async () => {
    const fixture = TestBed.createComponent(PickCaption);
    fixture.componentRef.setInput('text', '*Community Pick: <b>Hoops</b>*\n_Bring water._');
    fixture.componentRef.setInput('hint', 'Asterisks and underscores format as bold and italic.');
    let copies = 0;
    fixture.componentInstance.copyCaption.subscribe(() => copies++);
    await fixture.whenStable();
    const caption = (fixture.nativeElement as HTMLElement).querySelector('.caption')!;

    expect(caption.querySelector('.caption__title')?.textContent).toBe('Caption');
    expect(caption.querySelector('pre.caption__text')?.textContent).toBe(
      '*Community Pick: <b>Hoops</b>*\n_Bring water._',
    );
    expect(caption.querySelector('b')).toBeNull();
    expect(caption.querySelector('.caption__hint')?.textContent).toBe(
      'Asterisks and underscores format as bold and italic.',
    );
    const button = caption.querySelector('button')!;
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe('Copy caption');
    expect(caption.querySelector('[role="status"]')?.textContent?.trim()).toBe('');

    button.click();

    expect(copies).toBe(1);
  });

  it('reads "Copied" and says "Caption copied" while copied, with no hint when there is none', async () => {
    const fixture = TestBed.createComponent(PickCaption);
    fixture.componentRef.setInput('text', 'Community Pick: Easter Sunrise 5K');
    fixture.componentRef.setInput('copied', true);
    await fixture.whenStable();
    const caption = (fixture.nativeElement as HTMLElement).querySelector('.caption')!;

    expect(caption.querySelector('button')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Copied caption',
    );
    expect(caption.querySelector('[role="status"]')?.textContent?.trim()).toBe('Caption copied');
    expect(caption.querySelector('.caption__hint')).toBeNull();
  });
});
