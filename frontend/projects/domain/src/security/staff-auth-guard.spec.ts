import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  RedirectCommand,
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { STAFF_SESSION_SERVICE, type StaffRoleName, type StaffSessionApi } from '@cf/api';
import { firstValueFrom, isObservable, of, throwError, type Observable } from 'rxjs';
import { staffAuthGuard } from './staff-auth-guard';

/** Runs the guard for `url` with a session service whose `current()` answers `answer`. */
async function guard(
  answer: Observable<{ memberId: string; name: string; role: StaffRoleName }>,
  url = '/events',
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
    staffAuthGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  return isObservable(result) ? firstValueFrom(result) : result;
}

function failure(status: number, error: unknown = null): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, url: '/api/admin/session', error }));
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

  // L2-018 AC5 (ADR 0016): sessionExpiredInterceptor opens Staff sign in with the notice.
  it('a 401 session_expired is left to the interceptor', async () => {
    expect(await guard(failure(401, { status: 401, code: 'session_expired' }))).toBe(false);
  });

  // L2-019 AC5 (ADR 0017): the role decides each area; one row per role and area.
  it.each<{ role: StaffRoleName; url: string; opens: boolean }>([
    { role: 'Admin', url: '/events', opens: true },
    { role: 'Admin', url: '/services/listing-1', opens: true },
    { role: 'Moderator', url: '/', opens: true },
    { role: 'Moderator', url: '/members?status=flagged', opens: true },
    { role: 'Moderator', url: '/events', opens: false },
    { role: 'Moderator', url: '/services', opens: false },
    { role: 'Moderator', url: '/events/new?copy=1', opens: false },
    { role: 'Moderator', url: '/no-area-here', opens: true },
  ])('$role opening $url: opens $opens', async ({ role, url, opens }) => {
    const result = await guard(of({ memberId: 'm-1', name: 'Joel Mensah', role }), url);

    if (opens) {
      expect(result).toBe(true);
    } else {
      expect(result).toBeInstanceOf(RedirectCommand);
      const command = result as RedirectCommand;
      expect((command.redirectTo as UrlTree & { asked: string }).asked).toBe('/admins-only');
      expect(command.navigationBehaviorOptions).toEqual({ browserUrl: url });
    }
  });

  it('anything that is not an HTTP failure keeps the visitor where they are', async () => {
    expect(await guard(throwError(() => new Error('boom')))).toBe(false);
  });
});
