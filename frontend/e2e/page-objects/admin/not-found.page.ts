import { ErrorScreen } from '../shared/error-screen';

/** The admin app's not-found screen (mock `docs/mocks/pages/admin-not-found/`). */
export class AdminNotFoundPage extends ErrorScreen {
  /** Opens a URL no route of the admin app matches. */
  async open(path = '/no-such-page'): Promise<void> {
    await this.page.goto(path);
  }
}
