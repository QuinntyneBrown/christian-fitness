import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  test,
  type ApiHandlers,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import {
  WebJoinPage,
  type JoinDetails,
} from "../../../frontend/e2e/page-objects/web/join.page";
import {
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 06: slice 2.2, Join refusals, in the running member app. Each screen
 * is opened through its page object with the shared fixture, which answers every /api request
 * (409 email_taken, 400 field_too_long, 503, or Grace's session) and fails the take on a page
 * error or a request off localhost, as in every spec; no backend and no database ran. What each
 * screen says is checked before it is saved. The test counts, the API tests' names and the initial
 * total are what the runners and the build printed, captured with `capture()`. Not a test and not
 * a sweep: only `node tools/video-record/record.mjs docs/videos/06-slice-2-2-join-refusals` runs
 * it.
 */

const GRACE: JoinDetails = {
  fullName: "Grace Thompson",
  email: "grace.thompson@gmail.com",
  password: "abundantlife",
  homeChurch: "Grace Fellowship, Scarborough",
};
const SESSION = {
  memberId: "0190c0de-0000-7000-8000-000000000001",
  name: "Grace Thompson",
};
const TAKEN = "An account with this email already exists. Sign in instead?";

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

/** Answers every join with `reply` and records what was sent. */
function answer(api: ApiHandlers, reply: ApiReply): unknown[] {
  const sent: unknown[] = [];
  api.on("POST", "/api/account/join", (request) => {
    sent.push(request.postDataJSON());
    return reply;
  });
  api.on("GET", "/api/session", () => ({ json: SESSION }));
  return sent;
}

test("the form names each invalid field", async ({ page, api }) => {
  const sent = answer(api, { status: 201, json: SESSION });
  const join = new WebJoinPage(page);
  const takes: [Size, Theme][] = [
    ["XS", "light"],
    ["XL", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await join.open();
    await join.fill({
      fullName: "",
      email: "grace.thompson@gmail",
      password: "abc",
    });
    await join.submit();
    await expect(join.alertLinks).toHaveText([
      "Enter your full name",
      "Enter an email address like name@example.com",
      "Use at least 8 characters",
    ]);
    await expect(join.alert).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, name("join-invalid-fields", size, theme));
  }

  await frame(page, "XL", "light");
  await detail(join.alert, "web-join-summary", 12);
  await join.alertLink("Use at least 8 characters").click();
  await expect(join.password).toBeFocused();
  await join.fullName.fill("Grace Thompson");
  await expect(join.fullName).not.toHaveAttribute("aria-invalid");
  await join.password.focus();
  await detail(join.field("Password"), "web-join-password-error", 12);
  expect(sent).toEqual([]);
  capture("fieldsSent", sent.length);
});

test("a taken email", async ({ page, api }) => {
  answer(api, problem(409, "email_taken"));
  const join = new WebJoinPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["XS", "light"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await join.open();
    await join.fill(GRACE);
    await join.choose("Running", "Strength");
    await join.submitAndAwaitAnswer();
    await expect(join.fieldError("Email")).toHaveText(TAKEN);
    await expect(join.email).toHaveAttribute("aria-invalid", "true");
    await join.email.blur();
    await shot(page, name("join-taken", size, theme));
  }
  await frame(page, "XL", "light");
  await detail(join.field("Email"), "web-join-taken-email", 12);
});

test("a refused body and a server that does not answer", async ({
  page,
  api,
}) => {
  const join = new WebJoinPage(page);
  answer(api, problem(400, "field_too_long"));
  await frame(page, "XL", "light");
  await join.open();
  await join.fill(GRACE);
  await join.submitAndAwaitAnswer();
  await expect(join.alertTitle).toHaveText("Check your details");
  await detail(join.alert, "web-join-refused", 12);

  answer(api, problem(503, "server_error"));
  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await join.open();
    await join.fill(GRACE);
    await join.choose("Strength");
    await join.submitAndAwaitAnswer();
    await expect(join.alertTitle).toHaveText("We couldn't create your profile");
    await expect(join.fullName).toHaveValue("Grace Thompson");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, name("join-failed", size, "light"));
  }
});

test("a name holding markup stays text", async ({ page, api }) => {
  const markup = "<b>Grace</b> Thompson";
  api.on("POST", "/api/account/join", () => ({
    status: 201,
    json: { ...SESSION, name: markup },
  }));
  api.on("GET", "/api/session", () => ({
    json: { ...SESSION, name: markup },
  }));
  const join = new WebJoinPage(page);
  const home = new WebHomePage(page);
  await frame(page, "XL", "light");
  await join.open();
  await join.fill({ ...GRACE, fullName: markup });
  await join.submit();
  await expect(home.greeting).toHaveText("Welcome, <b>Grace</b>");
  await detail(home.greeting, "web-home-markup", 16);
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
  capture("unit", {
    command: "npm test",
    passed: Number(unitCount![1]),
    total: Number(unitCount![2]),
  });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", {
    command: "npx playwright test --list",
    tests: Number(specCount![1]),
    files: Number(specCount![2]),
  });

  const api = run(
    'dotnet test --logger "console;verbosity=normal"',
    path.join(root, "backend"),
  );
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map(
    (m) => Number(m[2]),
  );
  expect(totals.length, api).toBe(2);
  const names = (cls: string) => [
    ...new Set(
      [
        ...api.matchAll(
          new RegExp(`Passed ChristianFitness\\.\\w+\\.Tests\\.\\w+\\.${cls}\\.(\\w+)`, "g"),
        ),
      ].map((m) => m[1].replaceAll("_", " ")),
    ),
  ];
  const ruleRows = [
    ...api.matchAll(
      /Passed ChristianFitness\.Application\.Tests\.Account\.CreateAccountValidatorTests\.Given_a_join_form_When_it_is_validated/g,
    ),
  ].length;
  expect(ruleRows).toBeGreaterThan(0);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    refusals: [...names("JoinRefusalTests"), ...names("JoinRaceTests")],
    validation: names("JoinValidationTests"),
    ruleRows,
  });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(
    build,
  );
  expect(initial, build).not.toBeNull();
  capture("build", {
    command: "npx ng build web",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
  });
});
