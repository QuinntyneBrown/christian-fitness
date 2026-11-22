import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Button, ErrorPage } from '@cf/components';
import { returnPathOf, serverErrorText } from '@cf/domain';

/**
 * The admin app's server-error screen (mock docs/mocks/pages/admin-server-error/). The interceptor opens it
 * with `skipLocationChange`, so the address bar keeps the URL that failed, and passes the
 * response's reference and that URL as query parameters (L2-043 AC4, AC6).
 */
@Component({
  selector: 'cf-server-error-page',
  imports: [Button, ErrorPage],
  templateUrl: './server-error-page.html',
  styleUrl: './server-error-page.scss',
})
export class ServerErrorPage {
  // Read once: only the interceptor opens this screen, and it does not open it again while it is
  // showing. Binding query parameters to inputs (withComponentInputBinding) cost 2.4 kB initial.
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  /** What happened, with the response's reference when it is well formed. */
  protected readonly text = serverErrorText(this.query.get('reference'));
  /** The URL that failed, when it is a path inside the app; else `/`. */
  protected readonly retry = returnPathOf(this.query.get('from'));
}
