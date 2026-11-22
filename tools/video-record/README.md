# video-record

Saves a video's screenshots: runs the folder's `shots.ts` in Chromium against the running apps and
writes PNGs at double density into the folder's `shots/`. Standard: `docs/videos/README.md`,
"Screenshots".

```
node tools/video-record/record.mjs docs/videos/NN-slice-S-S-topic
node tools/video-record/record.mjs docs/videos/NN-slice-S-S-topic --backend   # a slice with no screen
node tools/video-record/record.mjs docs/videos/NN-slice-S-S-topic --commands  # nothing started: commands only
```

With `--backend` the Angular apps are not started; the API is, as built, on `:4312`
(`dotnet run --project backend/src/ChristianFitness.Api`) with a connection string to port 1, so
no database runs and readiness says so. `shots.ts` then uses Playwright's `request` against
`API_URL`, may run `cf` with `dotnet run`, and saves what was said with `capture(name, value)`.

With `--commands` nothing is started. `shots.ts` runs commands with `spawnSync` (`git`, `gh`,
`dotnet`), checks what they said and saves it with `capture(name, value)`: for a slice whose
system is neither an app nor the API, such as the CI pipeline of slice 1.3, which films the
GitHub Actions runs of its own pull request through `gh run view`.

It is not a test and not a sweep. It has its own Playwright config (`playwright.config.ts` here,
matching only `shots.ts` in the given folder), compares nothing, clears `CF_SWEEPS`, and is not
run by `npm run e2e` or CI. The member app on `:4310` and the admin app on `:4311` are reused when
they are running and started (then stopped) otherwise; `CF_WEB_PORT` and `CF_ADMIN_PORT` move
them, as in the e2e config, so a take in a worktree can use free ports of its own. Every `/api/**` request is answered by the
handlers of the shared fixture, `frontend/e2e/fixtures/test.ts`, as in every spec; it also fails
the take on a page error or a request off localhost. Playwright is the copy in
`frontend/node_modules` (`npm ci` there first).

## Writing `shots.ts`

```ts
import { test } from '../../../frontend/e2e/fixtures/test';
import { WebStartPage } from '../../../frontend/e2e/page-objects/web/start.page';
import { ADMIN_URL, detail, frame, shot } from '../../../tools/video-record/shots';

test('member app', async ({ page }) => {
  await frame(page, 'XS'); // 390×780, light
  await new WebStartPage(page).open(); // the page object opens the screen, as a spec does
  await shot(page, 'start-xs'); // shots/start-xs.png
  await frame(page, 'XL', 'dark'); // 1440×900, dark
  await shot(page, 'start-xl-dark');
});

test.describe('admin app', () => {
  test.use({ baseURL: ADMIN_URL });
  // ...
});
```

| Helper                                | What it does                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `frame(page, size, theme = 'light')`  | Sets the window (`'XS'` 390×780, `'M'` 768×1024, `'L'` 1024×768, `'XL'` 1440×900) and the theme, with reduced motion. Call it before opening a state. |
| `shot(page, name)`                    | Saves the window as `shots/<name>.png`, once the fonts have settled, with animations disabled and the caret hidden.                             |
| `detail(locator, name, pad = 16)`     | Saves one region with `pad` CSS pixels of air around it: the close-up of a scene.                                                               |
| `bringToTop(locator, offset = 96)`    | Scrolls a region to the top of the window before a shot.                                                                                        |
| `SIZES`, `shotsDir`                   | The four windows, and where the pictures go.                                                                                                    |
| `WEB_URL`, `ADMIN_URL`                | Where the two apps run while shots are taken.                                                                                                   |
| `API_URL`                             | Where the API runs under `--backend`.                                                                                                           |
| `capture(name, value)`                | Saves what the backend said as `window.FILM_CAPTURES[name]` in `shots/captures.js`, for `film.js` to set word for word.                         |

Selectors stay in the page objects of `frontend/e2e/page-objects/`; `shots.ts` names regions, as a
spec does.
