import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SendCard } from './send-card';

@Component({
  imports: [SendCard],
  template: `<cf-send-card
    label="Goes out"
    date="Sat Apr 18"
    meta="<i>7:00 AM</i> Eastern · 6,800 people"
    ><button type="button">Schedule issue</button></cf-send-card
  >`,
})
class Host {}

// L2-070 AC4 (review-card, "Send card"): when the issue goes out, to how many, and its action.
describe('SendCard', () => {
  it('reads the label, the date and the meta as text, with its action projected', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const card = (fixture.nativeElement as HTMLElement).querySelector('section.send-card')!;

    expect(card.querySelector('.send-card__label')?.textContent).toBe('Goes out');
    expect(card.querySelector('.send-card__date')?.textContent).toBe('Sat Apr 18');
    expect(card.querySelector('.send-card__meta')?.textContent).toBe(
      '<i>7:00 AM</i> Eastern · 6,800 people',
    );
    expect(card.querySelector('i')).toBeNull();
    expect(card.querySelector('.send-card__actions button')?.textContent).toBe('Schedule issue');
  });
});
