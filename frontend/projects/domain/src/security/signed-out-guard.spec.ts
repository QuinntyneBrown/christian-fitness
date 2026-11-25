import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import type { PartialMatchRouteSnapshot, Route, UrlSegment } from '@angular/router';
import { SESSION_SERVICE, type SessionApi } from '@cf/api';
import { firstValueFrom, isObservable, of, throwError, type Observable } from 'rxjs';
import { signedOutGuard } from './signed-out-guard';

/** Runs the guard with a session service whose `current()` answers `answer`. */
async function matches(answer: Observable<{ memberId: string; name: string }>): Promise<unknown> {
  const session: Partial<SessionApi> = { current: () => answer };
  const injector = Injector.create({
    providers: [{ provide: SESSION_SERVICE, useValue: session }],
  });
  const result = runInInjectionContext(injector, () =>
    signedOutGuard({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot),
  );
  return isObservable(result) ? firstValueFrom(result) : result;
}

function failure(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, url: '/api/session' }));
}

// ADR 0091: the signed-out claim route matches only a visitor; one row per answer.
describe('signedOutGuard', () => {
  it('a session does not match, so the member route of the same address opens', async () => {
    expect(await matches(of({ memberId: 'm-1', name: 'Grace Thompson' }))).toBe(false);
  });

  it('a 401 matches: the visitor sees the signed-out page', async () => {
    expect(await matches(failure(401))).toBe(true);
  });

  it.each([
    { why: 'a server error', status: 500 },
    { why: 'no answer', status: 0 },
    { why: 'a forbidden answer', status: 403 },
  ])('$why does not match: the member route decides', async ({ status }) => {
    expect(await matches(failure(status))).toBe(false);
  });
});
