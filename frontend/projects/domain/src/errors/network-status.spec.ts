import { TestBed } from '@angular/core/testing';
import { NetworkStatus, OFFLINE_PATH, returnPathOf } from '../public-api';

// L2-043 AC8, AC9 (ADR 0046): browser network state and offline return-path rule.
describe('NetworkStatus', () => {
  it('starts from navigator.onLine and updates on offline and online events', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    const status = TestBed.runInInjectionContext(() => new NetworkStatus());

    expect(status.online()).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect(status.online()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(status.online()).toBe(true);
  });

  it('stops listening when its owner is destroyed', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    TestBed.resetTestingModule();
    const status = TestBed.inject(NetworkStatus);
    TestBed.resetTestingModule();

    window.dispatchEvent(new Event('offline'));
    expect(status.online()).toBe(true);
  });
});

describe('OFFLINE_PATH and returnPathOf', () => {
  it('replaces /offline itself with / so Try again never loops', () => {
    expect(OFFLINE_PATH).toBe('/offline');
    expect(returnPathOf('/offline')).toBe('/');
    expect(returnPathOf('/offline?from=/events')).toBe('/');
    expect(returnPathOf('/events')).toBe('/events');
  });
});
