import { ErrorScreen } from '../shared/error-screen';

/** The member app's not-found screen (mock `docs/mocks/pages/not-found/`). */
export class WebNotFoundPage extends ErrorScreen {
  /** Opens a URL no route of the member app matches. */
  async open(path = '/no-such-page'): Promise<void> {
    await this.page.goto(path);
  }
}
