import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreferenceRow } from './preference-row';
import { PreferenceSection } from './preference-section';

@Component({
  imports: [PreferenceRow, PreferenceSection],
  template: `<cf-preference-section sectionId="email" heading="Email" sub="3 of <b>4</b> emails on."
    ><cf-preference-row><span class="one">A switch</span></cf-preference-row
    ><cf-preference-row action
      ><button type="button">Turn off all email</button></cf-preference-row
    ></cf-preference-section
  >`,
})
class Host {}

// L2-064 AC1, AC2 (preference-row.html): a section named by its heading, reached by its id, with its rows.
describe('PreferenceSection', () => {
  it('is a section named by its heading, with the line under it as text and its rows projected', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;

    expect(section.id).toBe('email');
    expect(section.getAttribute('aria-labelledby')).toBe('email-title');
    expect(section.querySelector('h2#email-title')?.textContent).toBe('Email');
    expect(section.querySelector('.pref__sub')?.textContent).toBe('3 of <b>4</b> emails on.');
    expect(section.querySelector('.pref__sub b')).toBeNull();
    expect(section.querySelector('.pref__rows .pref__row .one')?.textContent).toBe('A switch');
    expect(section.querySelector('.pref__rows .pref__action button')?.textContent).toBe(
      'Turn off all email',
    );
  });
});
