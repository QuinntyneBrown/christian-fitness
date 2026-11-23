import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconButton, Tooltip } from '../public-api';

@Component({
  imports: [Tooltip, IconButton],
  templateUrl: './tooltip.spec.html',
})
class TooltipHost {}

function render() {
  const fixture = TestBed.createComponent(TooltipHost);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  document.body.appendChild(element);
  const anchor = element.querySelector('.tooltip-anchor')!;
  const button = element.querySelector('button')!;
  const tip = element.querySelector('.tooltip')!;
  return { fixture, element, anchor, button, tip };
}

describe('Tooltip', () => {
  it('names its button, which carries no label of its own', () => {
    const { button, tip } = render();

    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(button.getAttribute('aria-labelledby')).toBe(tip.id);
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(tip.textContent?.replace(/\s+/g, ' ').trim()).toBe('Send message Enter');
  });

  it('hides on Escape without moving focus', () => {
    const { fixture, anchor, button } = render();
    button.focus();

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(anchor.classList.contains('tooltip-anchor--dismissed')).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it.each(['focusout', 'mouseleave'])('can show again after %s', (event) => {
    const { fixture, anchor, button } = render();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    anchor.closest('cf-tooltip')!.dispatchEvent(new Event(event));
    fixture.detectChanges();

    expect(anchor.classList.contains('tooltip-anchor--dismissed')).toBe(false);
  });
});
