import { TestBed } from '@angular/core/testing';
import { CountBadge, Status, UnreadDot, countText } from '../public-api';

describe('countText', () => {
  it.each([
    [1, '1'],
    [4, '4'],
    [99, '99'],
    [100, '99+'],
    [250, '99+'],
  ])('shows %i as "%s"', (count, text) => {
    expect(countText(count)).toBe(text);
  });
});

describe('CountBadge', () => {
  function render(count: number, pill = false) {
    const fixture = TestBed.createComponent(CountBadge);
    fixture.componentRef.setInput('count', count);
    fixture.componentRef.setInput('noun', 'unread');
    fixture.componentRef.setInput('pill', pill);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    [0, null, null],
    [1, '1', '1 unread'],
    [4, '4', '4 unread'],
    [99, '99', '99 unread'],
    [140, '99+', '140 unread'],
  ])('shows a count of %i as "%s", read as "%s"', (count, text, label) => {
    const badge = render(count).querySelector('.count-badge');

    expect(badge?.textContent?.trim() ?? null).toBe(text);
    expect(badge?.getAttribute('aria-label') ?? null).toBe(label);
  });

  it('takes the pill form at the end of a row', () => {
    const element = render(1, true);

    expect(element.querySelector('.count-pill')?.getAttribute('aria-label')).toBe('1 unread');
    expect(element.querySelector('.count-badge')).toBeNull();
  });
});

describe('UnreadDot', () => {
  it('is a labelled image, never a bare dot', () => {
    const fixture = TestBed.createComponent(UnreadDot);
    fixture.componentRef.setInput('label', '3 unread');
    fixture.detectChanges();

    const dot = (fixture.nativeElement as HTMLElement).querySelector('.unread-dot')!;
    expect(dot.getAttribute('role')).toBe('img');
    expect(dot.getAttribute('aria-label')).toBe('3 unread');
  });
});

describe('Status', () => {
  it('is never focusable', () => {
    const fixture = TestBed.createComponent(Status);
    fixture.componentRef.setInput('variant', 'flagged');
    fixture.detectChanges();

    const status = (fixture.nativeElement as HTMLElement).querySelector('.status')!;
    expect(status.tagName).toBe('SPAN');
    expect(status.hasAttribute('tabindex')).toBe(false);
  });
});
