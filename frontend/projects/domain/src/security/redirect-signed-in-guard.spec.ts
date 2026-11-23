import { Injector, runInInjectionContext } from '@angular/core';
import {
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { SESSION_SERVICE, type SessionApi } from '@cf/api';
import { firstValueFrom, isObservable, of, throwError, type Observable } from 'rxjs';
import { redirectSignedInGuard } from './redirect-signed-in-guard';

async function guard(answer: Observable<{ memberId: string; name: string }>): Promise<unknown> {
  const session: Partial<SessionApi> = { current: () => answer };
  const router = {
    createUrlTree: (commands: unknown[]) => Object.assign(new UrlTree(), { asked: commands }),
  };
  const injector = Injector.create({
    providers: [
      { provide: SESSION_SERVICE, useValue: session },
      { provide: Router, useValue: router },
    ],
  });
  const result = runInInjectionContext(injector, () =>
    redirectSignedInGuard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
  );
  return isObservable(result) ? firstValueFrom(result) : result;
}

// L2-001 AC4: a signed-in member opening the landing page is sent to Home.
describe('redirectSignedInGuard', () => {
  it('a session sends the member to Home', async () => {
    const result = await guard(of({ memberId: 'm-1', name: 'Grace Thompson' }));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree & { asked: unknown }).asked).toEqual(['/home']);
  });

  it('no session leaves the visitor on the page', async () => {
    expect(await guard(throwError(() => new Error('401')))).toBe(true);
  });
});
