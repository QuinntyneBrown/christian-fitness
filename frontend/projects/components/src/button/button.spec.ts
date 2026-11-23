import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button, IconButton } from '../public-api';

@Component({
  imports: [Button],
  templateUrl: './button.spec.html',
})
class ButtonHost {
  readonly busy = signal(false);
  readonly disabled = signal(false);
  clicks = 0;
  submits = 0;

  onSubmit(event: Event): void {
    event.preventDefault();
    this.submits++;
  }
}

function render() {
  const fixture = TestBed.createComponent(ButtonHost);
  fixture.detectChanges();
  const button = fixture.nativeElement.querySelector('button.btn') as HTMLButtonElement;
  return { fixture, host: fixture.componentInstance, button };
}

describe('Button', () => {
  it('submits its form and reaches the consumer when pressed', () => {
    const { host, button } = render();

    button.click();

    expect(host.clicks).toBe(1);
    expect(host.submits).toBe(1);
  });

  it('is announced busy and ignores presses while busy', async () => {
    const { fixture, host, button } = render();
    host.busy.set(true);
    await fixture.whenStable();

    button.click();

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(host.clicks).toBe(0);
    expect(host.submits).toBe(0);
  });

  it('drops aria-busy when the work is done', async () => {
    const { fixture, host, button } = render();
    host.busy.set(true);
    await fixture.whenStable();
    host.busy.set(false);
    await fixture.whenStable();

    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('cannot be pressed while disabled', async () => {
    const { fixture, host, button } = render();
    host.disabled.set(true);
    await fixture.whenStable();

    expect(button.disabled).toBe(true);
  });

  it('is a link that loads its href, with no button, when given one', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('href', '/events');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a.btn')?.getAttribute('href')).toBe('/events');
    expect(element.querySelector('button')).toBeNull();
  });
});

describe('IconButton', () => {
  it('is named by its label', () => {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('label', 'Close');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Close');
    expect(button.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('is named by a tooltip instead of a label when labelled by one', () => {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('labelledBy', 'tip-send');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-labelledby')).toBe('tip-send');
    expect(button.hasAttribute('aria-label')).toBe(false);
  });

  it('cannot be pressed while disabled', () => {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('label', 'Close');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('button')!.disabled).toBe(true);
  });
});
