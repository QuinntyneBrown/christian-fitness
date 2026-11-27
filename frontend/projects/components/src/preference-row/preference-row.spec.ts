import { Component, signal } from '@angular/core';
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

@Component({
  imports: [PreferenceRow],
  template: `<cf-preference-row
      split
      legend="Download <b>your</b> data"
      description="As a .zip"
      [done]="done()"
      ><button type="button">Request download</button></cf-preference-row
    ><cf-preference-row note>Read our <a href="/privacy">Privacy Policy</a>.</cf-preference-row>`,
})
class SplitHost {
  readonly done = signal<string | null>(null);
}

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

// L2-066 AC1, AC3 (preference-row.html, split row): a title and its line beside the action, and
// the done words, announced, in place of the action once given.
describe('PreferenceRow, split and note', () => {
  it('shows the title, the line and the action, then the done words in its place', async () => {
    const fixture = TestBed.createComponent(SplitHost);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const row = element.querySelector('.pref__row--split')!;

    expect(row.querySelector('.pref__legend')?.textContent).toBe('Download <b>your</b> data');
    expect(row.querySelector('.pref__desc')?.textContent).toBe('As a .zip');
    expect(row.querySelector('button')?.textContent).toBe('Request download');
    expect(row.querySelector('.pref__done')).toBeNull();
    expect(element.querySelector('.pref__note a')?.getAttribute('href')).toBe('/privacy');

    fixture.componentInstance.done.set('Requested.');
    await fixture.whenStable();

    expect(row.querySelector('button')).toBeNull();
    expect(row.querySelector('.pref__done')?.getAttribute('role')).toBe('status');
    expect(row.querySelector('.pref__done')?.textContent?.trim()).toBe('Requested.');
  });
});
