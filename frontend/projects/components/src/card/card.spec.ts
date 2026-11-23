import { TestBed } from '@angular/core/testing';
import { Card, type CardElement } from './card';

describe('Card', () => {
  // The element that fits (card.html, "Accessibility"); the card itself adds no role and is never
  // focusable.
  it.each<[CardElement, string]>([
    ['div', 'DIV'],
    ['article', 'ARTICLE'],
    ['section', 'SECTION'],
  ])('renders as a <%s>', async (element, tag) => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('element', element);
    fixture.componentRef.setInput('labelledBy', 'register-title');
    await fixture.whenStable();

    const card = fixture.nativeElement.querySelector('.card') as HTMLElement;
    expect(card.tagName).toBe(tag);
    expect(card.getAttribute('role')).toBeNull();
    expect(card.getAttribute('aria-labelledby')).toBe('register-title');
    expect(card.tabIndex).toBe(-1);
  });
});
