import { TestBed } from '@angular/core/testing';
import { DateBadge, type DateBadgeVariant } from './date-badge';

describe('DateBadge', () => {
  // Every form is a visual shortcut (date-badge.html, "Accessibility"): the full date is in text
  // nearby, so screen readers hear it once.
  it.each<[DateBadgeVariant]>([['badge'], ['tile']])(
    'as a %s, shows the month and day and is hidden from assistive technology',
    async (variant) => {
      const fixture = TestBed.createComponent(DateBadge);
      fixture.componentRef.setInput('variant', variant);
      fixture.componentRef.setInput('month', 'Apr');
      fixture.componentRef.setInput('day', '18');
      await fixture.whenStable();

      const badge = fixture.nativeElement.firstElementChild as HTMLElement;
      expect(badge.getAttribute('aria-hidden')).toBe('true');
      expect(badge.textContent).toBe('Apr18');
    },
  );
});
