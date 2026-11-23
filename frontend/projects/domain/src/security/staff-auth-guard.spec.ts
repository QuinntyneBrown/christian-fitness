import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { STAFF_SESSION_SERVICE, type StaffSessionApi } from '@cf/api';
import { firstValueFrom, isObservable, of, throwError, type Observable } from 'rxjs';
import { staffAuthGuard } from './staff-auth-guard';

/** Runs the guard with a session service whose `current()` answers `answer`. */
async function guard(
  answer: Observable<{ memberId: string; name: string; role: 'Admin' }>,
): Promise<unknown> {
  const session: Partial<StaffSessionApi> = { current: () => answer };
  const router = { parseUrl: (url: string) => Object.assign(new UrlTree(), { asked: url }) };
  const injector = Injector.create({
    providers: [
      { provide: STAFF_SESSION_SERVICE, useValue: session },
      { provide: Router, useValue: router },
    ],
  });
  const result = runInInjectionContext(injector, () =>
    staffAuthGuard({} as ActivatedRouteSnapshot, { url: '/events' } as RouterStateSnapshot),
  );
  return isObservable(result) ? firstValueFrom(result) : result;
}

function failure(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, url: '/api/admin/session' }));
}

// L2-018 AC4, ADR 0011: a staff route opens only with a staff session; one row per answer.
describe('staffAuthGuard', () => {
  it('a session opens the route', async () => {
    expect(await guard(of({ memberId: 'm-1', name: 'Dana Reyes', role: 'Admin' }))).toBe(true);
  });

  it('a 401 sends the visitor to sign in', async () => {
    const result = await guard(failure(401));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree & { asked: string }).asked).toBe('/sign-in');
  });

  it.each([
    // why, status: the server-error screen or the screen they are on handles these
    { why: 'a server error', status: 500 },
    { why: 'an unavailable server', status: 503 },
    { why: 'no answer', status: 0 },
    { why: 'a forbidden answer', status: 403 },
  ])('$why ($status) keeps the visitor where they are', async ({ status }) => {
    expect(await guard(failure(status))).toBe(false);
  });

  it('anything that is not an HTTP failure keeps the visitor where they are', async () => {
    expect(await guard(throwError(() => new Error('boom')))).toBe(false);
  });
});
