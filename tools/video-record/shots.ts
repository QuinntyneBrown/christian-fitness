import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

/**
 * Helpers for a video's `shots.ts`. A shot is a PNG of the running app at double density, saved
 * in the video folder's `shots/`; `film.js` then draws a phone, a tablet or a browser window
 * around it. See docs/videos/README.md, "Screenshots".
 */

/**
 * Where the apps run while shots are taken: the member app and the admin app. `CF_WEB_PORT` and
 * `CF_ADMIN_PORT` move them, as in the e2e config, so a take in one worktree never reuses another
 * session's server.
 */
export const WEB_PORT = Number(process.env['CF_WEB_PORT'] ?? 4310);
export const ADMIN_PORT = Number(process.env['CF_ADMIN_PORT'] ?? 4311);
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;
/** Where the API runs when `record.mjs --backend` films a slice with no screen. */
export const API_URL = 'http://localhost:4312';

/** Where the pictures go: `<video folder>/shots`. */
export const shotsDir = path.resolve(process.env['CF_VIDEO_DIR'] ?? '.', 'shots');

/** The four form factors a film shows. */
export const SIZES = {
  XS: { width: 390, height: 780 },
  M: { width: 768, height: 1024 },
  L: { width: 1024, height: 768 },
  XL: { width: 1440, height: 900 },
} as const;
export type Size = keyof typeof SIZES;
export type Theme = 'light' | 'dark';

/** Sets the window and the theme before a state is opened. Light unless `theme` says dark. */
export async function frame(page: Page, size: Size, theme: Theme = 'light'): Promise<void> {
  await page.setViewportSize(SIZES[size]);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
}

/** Waits until the bundled faces are drawn and stops whatever still moves. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

function file(name: string): string {
  mkdirSync(shotsDir, { recursive: true });
  return path.join(shotsDir, `${name}.png`);
}

/** Saves what the window shows as `shots/<name>.png`. */
export async function shot(page: Page, name: string): Promise<void> {
  await settle(page);
  await page.screenshot({ path: file(name), animations: 'disabled', caret: 'hide' });
}

/** Saves one region with `pad` CSS pixels of air around it: the close-up of a scene. */
export async function detail(region: Locator, name: string, pad = 16): Promise<void> {
  const page = region.page();
  await region.scrollIntoViewIfNeeded();
  await settle(page);
  const box = await region.boundingBox();
  if (!box) throw new Error(`The region of "${name}" is not on the page.`);
  const view = page.viewportSize()!;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  await page.screenshot({
    path: file(name),
    animations: 'disabled',
    caret: 'hide',
    clip: {
      x,
      y,
      width: Math.min(view.width - x, box.x + box.width + pad - x),
      height: Math.min(view.height - y, box.y + box.height + pad - y),
    },
  });
}

/** Brings a region to the top of the window, `offset` pixels down, before a shot. */
export async function bringToTop(region: Locator, offset = 96): Promise<void> {
  await region.evaluate((el, by) => {
    const top = el.getBoundingClientRect().top + window.scrollY - by;
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  }, offset);
}

/**
 * Saves what the running backend said (a response, a command's output) for `film.js` to draw:
 * `shots/captures.js` sets `window.FILM_CAPTURES[name] = value`. For a slice with no screen, the
 * captures are its pictures: the film sets the real words in a terminal, never typed-in copies.
 * `slides.html` loads `shots/captures.js` before `film.js`.
 */
export function capture(name: string, value: unknown): void {
  mkdirSync(shotsDir, { recursive: true });
  const target = path.join(shotsDir, 'captures.js');
  const prefix = 'window.FILM_CAPTURES = ';
  const all: Record<string, unknown> = existsSync(target)
    ? JSON.parse(readFileSync(target, 'utf8').slice(prefix.length).replace(/;\s*$/, ''))
    : {};
  all[name] = value;
  writeFileSync(target, `${prefix}${JSON.stringify(all, null, 2)};
`);
}
