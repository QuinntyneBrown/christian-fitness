import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  convertToParamMap,
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { SESSION_SERVICE, type SessionApi } from '@cf/api';
import { firstValueFrom, isObservable, of, throwError, type Observable } from 'rxjs';
import { eventLinkGuard } from './event-link-guard';

const ID = '018f0000-0000-7000-8000-000000000001';

/** Runs the guard for `/e/<ID>` with a session service whose `current()` answers `answer`. */
async function opens(answer: Observable<{ memberId: string; name: string }>): Promise<unknown> {
  const session: Partial<SessionApi> = { current: () => answer };
  const injector = Injector.create({
    providers: [{ provide: SESSION_SERVICE, useValue: session }],
    parent: TestBed.inject(Injector),
  });
  const route = { paramMap: convertToParamMap({ id: ID }) } as ActivatedRouteSnapshot;
  const result = runInInjectionContext(injector, () =>
    eventLinkGuard(route, { url: `/e/${ID}` } as RouterStateSnapshot),
  );
  const value = isObservable(result) ? await firstValueFrom(result) : result;
  return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value;
}

function failure(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, url: '/api/session' }));
}

// L2-072 AC9 (ADR 0098): an event link; one row per answer of the session read.
describe('eventLinkGuard', () => {
  it('a member goes on to the event', async () => {
    expect(await opens(of({ memberId: 'm-1', name: 'Grace Thompson' }))).toBe(`/events/${ID}`);
  });

  it('a visitor goes to Join, which returns to the event', async () => {
    expect(await opens(failure(401))).toBe(`/join?returnUrl=%2Fevents%2F${ID}`);
  });

  it.each([
    { why: 'a server error', status: 500 },
    { why: 'no answer', status: 0 },
  ])('$why keeps them where they are', async ({ status }) => {
    expect(await opens(failure(status))).toBe(false);
  });
});
