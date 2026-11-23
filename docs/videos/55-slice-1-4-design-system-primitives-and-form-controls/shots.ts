import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, test, type ApiReply } from "../../../frontend/e2e/fixtures/test";
import { WebJoinPage } from "../../../frontend/e2e/page-objects/web/join.page";
import { WebSignInPage } from "../../../frontend/e2e/page-objects/web/sign-in.page";
import {
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 55: slice 1.4, Design-system primitives and form controls, in the
 * running member app. No screen composes the new components yet (slice 1.6 moves the screens onto
 * them), so the pictures are the two library components screens already use, completed in this
 * slice: `cf-text-field`, now composed of `cf-form-field`, and `cf-button`. Each screen is opened
 * through its page object with the shared fixture, which answers every /api request (Grace's
 * session held until the busy shot is saved) and fails the take on a page error or a request off
 * localhost, as in every spec; no backend and no database ran. What each screen says is checked
 * before it is saved. The test counts and the initial totals are what the runners and the build
 * printed, captured with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/55-slice-1-4-design-system-primitives-and-form-controls`
 * runs it.
 */

const EMAIL = "grace.thompson@gmail.com";
const PASSWORD = "abundantlife";
const SESSION = {
  memberId: "0190c0de-0000-7000-8000-000000000001",
  name: "Grace Thompson",
};

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

test("sign in: the text field and the button from the library", async ({ page, api }) => {
  const signIn = new WebSignInPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await signIn.open();
    await expect(signIn.heading).toHaveText("Welcome back");
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.password.blur();
    await shot(page, name("sign-in", size, theme));
  }

  // Held until the shot of the busy button is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  api.on("POST", "/api/session", async () => {
    await answered;
    return { json: SESSION } satisfies ApiReply;
  });
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submit();
  await expect(signIn.submitButton).toHaveText("Signing in…");
  await expect(signIn.submitButton).toHaveAttribute("aria-busy", "true");
  await detail(signIn.form, "web-sign-in-busy", 16);
  answer();
});

test("join: each field's error, from the form field", async ({ page }) => {
  const join = new WebJoinPage(page);
  for (const [size, theme] of [
    ["XL", "light"],
    ["XS", "light"],
  ] as [Size, Theme][]) {
    await frame(page, size, theme);
    await join.open();
    await join.fill({ fullName: "Grace Thompson", email: "grace.thompson@gmail", password: "abc" });
    await join.submit();
    await expect(join.fieldError("Email")).toHaveText(
      "Enter an email address like name@example.com",
    );
    await expect(join.fieldError("Password")).toHaveText("Use at least 8 characters");
    await expect(join.password).toHaveAttribute("aria-invalid", "true");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, name("join-invalid", size, theme));
  }
  await frame(page, "XL", "light");
  await join.password.focus();
  await detail(join.field("Password"), "web-join-password-error", 12);
  capture("describedBy", await join.password.getAttribute("aria-describedby"));
});

test("what the runners and the build say", () => {
  test.setTimeout(400_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  // `npm test` runs the domain suite, then the components suite.
  const unit = run("npm test", path.join(root, "frontend"));
  const counts = [...unit.matchAll(/Tests\s+(\d+) passed \((\d+)\)/g)].map((m) => Number(m[1]));
  expect(counts.length, unit).toBe(2);
  const files = /Test Files\s+(\d+) passed/g;
  const fileCounts = [...unit.matchAll(files)].map((m) => Number(m[1]));
  capture("unit", {
    command: "npm test",
    domain: counts[0],
    components: counts[1],
    componentFiles: fileCounts[1],
  });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]) });

  const build = run("npm run build", path.join(root, "frontend"));
  const totals = [...build.matchAll(/Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/g)].map(
    (m) => Number(m[1]),
  );
  expect(totals.length, build).toBe(2);
  capture("build", { command: "npm run build", web: totals[0], admin: totals[1] });
});
