import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog],
  template: `
    <cf-dialog
      heading="Request a booking"
      subtitle="Danielle Okafor · Personal trainer · From $70 / session"
      titleId="booking-title"
      descriptionId="booking-desc"
      [successHeading]="successHeading()"
      successText="Danielle replies in Messages."
      (closed)="closed = closed + 1"
    >
      <p class="host-field">What would you like?</p>
      <button slot="foot" type="button" class="host-send">Send request</button>
    </cf-dialog>
  `,
})
class Host {
  closed = 0;
  readonly successHeading = signal<string | undefined>(undefined);
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Dialog', () => {
  it('names itself by its title and describes itself by its subtitle, with the ids the opener gives the CDK Dialog', async () => {
    const { el } = await render();

    const title = el.querySelector('#booking-title');
    const sub = el.querySelector('#booking-desc');
    expect(title?.textContent).toBe('Request a booking');
    expect(title?.tagName).toBe('H2');
    expect(sub?.textContent).toBe('Danielle Okafor · Personal trainer · From $70 / session');
  });

  it('shows its body and its footer actions', async () => {
    const { el } = await render();

    expect(el.querySelector('.dialog__body .host-field')).not.toBeNull();
    expect(el.querySelector('.dialog__foot .host-send')).not.toBeNull();
  });

  it('emits closed from a button named "Close" and from the scrim', async () => {
    const { fixture, el } = await render();

    const close = el.querySelector('.dialog__close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    close.click();
    (el.querySelector('.scrim') as HTMLElement).click();

    expect(fixture.componentInstance.closed).toBe(2);
  });

  it('hides the scrim from assistive technology', async () => {
    const { el } = await render();

    expect(el.querySelector('.scrim')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('on success, replaces the body with a message announced politely', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.successHeading.set('Request sent');
    await fixture.whenStable();

    const success = el.querySelector('.dialog__success') as HTMLElement;
    expect(success.getAttribute('role')).toBe('status');
    expect(success.textContent).toContain('Request sent');
    expect(success.textContent).toContain('Danielle replies in Messages.');
    expect(el.querySelector('.host-field')).toBeNull();
  });
});
