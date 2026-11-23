import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  test,
  XSRF_TOKEN,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { WebResetPasswordPage } from "../../../frontend/e2e/page-objects/web/reset-password.page";
import {
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 38: slice 20.2, Choose a new password, in the running member app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (the antiforgery token, the link's check, 204 for the save, 410 reset_link_expired, 400,
 * 503) and fails the take on a page error or a request off localhost, as in every spec; no backend
 * and no database ran. What each screen says is checked before it is saved. The test counts, the
 * API tests' names and the initial total are what the runners and the build printed, captured
 * with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/38-slice-20-2-choose-a-new-password` runs it.
 */

const TOKEN = "k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X";
const EMAIL = "grace.thompson@gmail.com";
const PASSWORD = "graceandgrit";
const CHECK = "/api/account/password-reset/check";
const COMPLETE = "/api/account/password-reset/complete";

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

test("checking the link, and the form", async ({ page, api }) => {
  const reset = new WebResetPasswordPage(page);
  // Held until the shot of "Checking your link…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  let hold = true;
  const checks: { body: unknown; token: string | undefined }[] = [];
  api.on("POST", CHECK, async (request) => {
    checks.push({ body: request.postDataJSON(), token: request.headers()["x-xsrf-token"] });
    if (hold) await answered;
    return { json: { email: EMAIL } };
  });
  await frame(page, "XL", "light");
  await reset.open(TOKEN);
  await expect(reset.lead).toHaveText("Checking your link…");
  await shot(page, name("checking", "XL", "light"));
  await detail(reset.form, "web-checking", 16);
  answer();
  hold = false;
  await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
  expect(reset.location()).toBe("/reset-password");
  expect(checks[0]).toEqual({ body: { token: TOKEN }, token: XSRF_TOKEN });
  capture("check", { address: reset.location(), body: checks[0]!.body });

  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    // A fragment change alone would not load the page again.
    await page.goto("about:blank");
    await reset.open(TOKEN);
    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.confirm.blur();
    await shot(page, name("form", size, theme));
  }
});

test("saving, and saved", async ({ page, api }) => {
  const reset = new WebResetPasswordPage(page);
  api.on("POST", CHECK, () => ({ json: { email: EMAIL } }));
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  let hold = true;
  const saves: unknown[] = [];
  api.on("POST", COMPLETE, async (request) => {
    saves.push(request.postDataJSON());
    if (hold) await answered;
    return { status: 204 };
  });
  await frame(page, "XL", "light");
  await reset.open(TOKEN);
  await reset.fill(PASSWORD, PASSWORD);
  await reset.submit();
  await expect(reset.submitButton).toHaveText("Saving…");
  await expect(reset.submitButton).toBeDisabled();
  await detail(reset.form, "web-saving", 16);
  answer();
  hold = false;
  await expect(reset.heading).toHaveText("Password saved");
  expect(saves).toEqual([{ token: TOKEN, password: PASSWORD }]);
  await shot(page, name("saved", "XL", "light"));
  await detail(reset.form, "web-saved", 16);

  for (const [size, theme] of [["XS", "light"], ["XL", "dark"]] as [Size, Theme][]) {
    await frame(page, size, theme);
    // A fragment change alone would not load the page again.
    await page.goto("about:blank");
    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.submit();
    await expect(reset.heading).toHaveText("Password saved");
    await shot(page, name("saved", size, theme));
  }
});

test("an expired link", async ({ page, api }) => {
  const reset = new WebResetPasswordPage(page);
  api.on("POST", CHECK, () => problem(410, "reset_link_expired"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    // A fragment change alone would not load the page again.
    await page.goto("about:blank");
    await reset.open(TOKEN);
    await expect(reset.heading).toHaveText("This link has expired");
    await expect(reset.actionLink).toHaveText("Send a new link");
    await shot(page, name("expired", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(reset.form, "web-expired", 16);
});

test("passwords that differ, and failures", async ({ page, api }) => {
  const reset = new WebResetPasswordPage(page);
  api.on("POST", CHECK, () => ({ json: { email: EMAIL } }));
  let saves = 0;
  api.on("POST", COMPLETE, () => {
    saves++;
    return problem(503, "server_error");
  });
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    // A fragment change alone would not load the page again.
    await page.goto("about:blank");
    await reset.open(TOKEN);
    await reset.fill(PASSWORD, "graceandgrt");
    await reset.submit();
    await expect(reset.alertTitle).toHaveText("Your passwords don't match");
    await expect(reset.confirm).toHaveAttribute("aria-invalid", "true");
    await shot(page, name("invalid", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(reset.form, "web-invalid", 16);
  expect(saves).toBe(0);

  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    // A fragment change alone would not load the page again.
    await page.goto("about:blank");
    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.awaitSave(() => reset.submit());
    await expect(reset.alertTitle).toHaveText("We couldn't save your password");
    await expect(reset.confirm).toHaveValue(PASSWORD);
    await shot(page, name("failed", size, "light"));
  }
  await detail(reset.alert, "web-failed", 12);
});

test("what the runners and the build say", () => {
  test.setTimeout(300_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  const unitCount = /Tests\s+(\d+) passed \((\d+)\)/.exec(unit);
  expect(unitCount, unit).not.toBeNull();
  capture("unit", { command: "npm test", passed: Number(unitCount![1]), total: Number(unitCount![2]) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]), files: Number(specCount![2]) });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const names = (cls: string) => [
    ...new Set(
      [...api.matchAll(new RegExp(`Passed ChristianFitness\\.\\w+\\.Tests\\.[\\w.]+\\.${cls}\\.(\\w+)`, "g"))].map((m) =>
        m[1].replaceAll("_", " "),
      ),
    ),
  ];
  const complete = names("PasswordResetCompleteTests");
  const refusal = names("PasswordResetRefusalTests");
  const race = names("PasswordResetRaceTests");
  expect(complete.length).toBeGreaterThan(0);
  expect(refusal.length).toBeGreaterThan(0);
  expect(race.length).toBeGreaterThan(0);
  capture("backend", { command: "dotnet test", passed: totals.reduce((a, b) => a + b, 0), complete, refusal, race });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  capture("build", { command: "npx ng build web", raw: Number(initial![1]), transfer: Number(initial![2]) });
});
