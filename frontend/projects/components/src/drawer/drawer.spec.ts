import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Drawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <cf-drawer heading="New event" titleId="event-editor-title" (closed)="closed = closed + 1">
      <form class="host-form"><input aria-label="Title" /></form>
      <button slot="foot" type="button" class="host-save">Save draft</button>
    </cf-drawer>
  `,
})
class Host {
  closed = 0;
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Drawer', () => {
  it('names itself by its title, with the id the opener gives the CDK Dialog', async () => {
    const { el } = await render();

    const title = el.querySelector('#event-editor-title');
    expect(title?.textContent).toBe('New event');
    expect(title?.tagName).toBe('H2');
  });

  it('holds the form in its scrolling body and the actions in its footer', async () => {
    const { el } = await render();

    expect(el.querySelector('.drawer__body .host-form')).not.toBeNull();
    expect(el.querySelector('.drawer__foot .host-save')).not.toBeNull();
  });

  it('emits closed from a button named "Close" and from the scrim', async () => {
    const { fixture, el } = await render();

    const close = el.querySelector('.drawer__close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    close.click();
    (el.querySelector('.scrim') as HTMLElement).click();

    expect(fixture.componentInstance.closed).toBe(2);
  });
});
