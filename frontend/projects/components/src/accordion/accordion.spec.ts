import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Accordion } from './accordion';
import { AccordionItem } from './accordion-item';

@Component({
  imports: [Accordion, AccordionItem],
  template: `
    <cf-accordion>
      <cf-accordion-item summary="What should I bring to a run?" (toggled)="log.push($event)">
        <p>Water, a layer and good shoes.</p>
      </cf-accordion-item>
      <cf-accordion-item summary="Is my home church shared with anyone?" open>
        <p>Only if you choose to show it.</p>
      </cf-accordion-item>
    </cf-accordion>
  `,
})
class Host {
  readonly log: boolean[] = [];
}

describe('Accordion', () => {
  it('uses native details and summary, opening as told', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('details'),
    ) as HTMLDetailsElement[];

    expect(items.map((item) => item.open)).toEqual([false, true]);
    expect(items[0].querySelector('summary')?.textContent?.trim()).toBe(
      'What should I bring to a run?',
    );
    expect(items[0].querySelector('summary svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps items independent and reports when one opens or closes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('details'),
    ) as HTMLDetailsElement[];

    const summary = items[0].querySelector('summary') as HTMLElement;
    summary.click();
    await fixture.whenStable();
    summary.click();
    await fixture.whenStable();

    expect(items[1].open).toBe(true);
    expect(fixture.componentInstance.log).toEqual([true, false]);
  });
});
