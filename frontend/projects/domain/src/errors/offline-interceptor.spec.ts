import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withNavigationErrorHandler } from '@angular/router';
import { offlineInterceptor, offlineNavigationErrorHandler } from './offline-interceptor';

@Component({ selector: 'cf-spec-blank', templateUrl: './offline-interceptor.spec.html' })
class BlankSpec {}

// L2-043 AC9 (ADR 0046): only a GET to /api/ failing with status 0 or a lazy route failing while
// navigator.onLine is false opens /offline; online status-0 errors, 4xx/5xx answers and writes pass on.
describe('offlineInterceptor', () => {
  function setup(onLine: boolean) {
    Object.defineProperty(window.navigator, 'onLine', { value: onLine, configurable: true });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'events', component: BlankSpec },
            {
              path: 'broken-chunk',
              loadComponent: () => Promise.reject(new Error('Failed to fetch module')),
            },
            { path: 'offline', component: BlankSpec },
          ],
          withNavigationErrorHandler(offlineNavigationErrorHandler),
        ),
        provideHttpClient(withInterceptors([offlineInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
    };
  }

  it('opens /offline with skipLocationChange and from when offline GET to /api/ fails with status 0', async () => {
    const { http, backend, router } = setup(false);
    await router.navigateByUrl('/events');
    const spy = vi.spyOn(router, 'navigate');

    let caught = false;
    http.get('/api/events').subscribe({ error: () => (caught = true) });
    backend.expectOne('/api/events').error(new ProgressEvent('error'));

    expect(caught).toBe(true);
    expect(spy).toHaveBeenCalledWith(['/offline'], {
      skipLocationChange: true,
      queryParams: { from: '/events' },
    });
  });

  it.each([
    { why: 'online status 0', onLine: true, method: 'GET', url: '/api/events', status: 0 },
    { why: 'offline POST write', onLine: false, method: 'POST', url: '/api/events', status: 0 },
    { why: 'offline 500 answer', onLine: false, method: 'GET', url: '/api/events', status: 500 },
    {
      why: 'offline non-API asset',
      onLine: false,
      method: 'GET',
      url: '/assets/x.json',
      status: 0,
    },
  ])('does not open /offline for $why', async ({ onLine, method, url, status }) => {
    const { http, backend, router } = setup(onLine);
    await router.navigateByUrl('/events');
    const spy = vi.spyOn(router, 'navigate');

    const call = method === 'POST' ? http.post(url, {}) : http.get(url);
    call.subscribe({ error: () => undefined });
    const req = backend.expectOne(url);
    if (status === 0) {
      req.error(new ProgressEvent('error'));
    } else {
      req.flush({ code: 'error' }, { status, statusText: 'Error' });
    }

    expect(spy).not.toHaveBeenCalled();
  });

  it('redirects to /offline when a lazy route chunk fails while offline', async () => {
    const { router } = setup(false);

    await router.navigateByUrl('/broken-chunk');

    expect(router.url).toBe('/offline?from=%2Fbroken-chunk');
  });
});
