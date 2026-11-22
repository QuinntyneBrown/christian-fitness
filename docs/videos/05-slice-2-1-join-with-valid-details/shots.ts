import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  test,
  type ApiHandlers,
} from "../../../frontend/e2e/fixtures/test";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import {
  WebJoinPage,
  type JoinDetails,
} from "../../../frontend/e2e/page-objects/web/join.page";
import { WebServerErrorPage } from "../../../frontend/e2e/page-objects/web/server-error.page";
import {
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 05: slice 2.1, Join with valid details, in the running member app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (join with Grace's session, the session itself, or a 500 with a reference) and fails the
 * take on a page error or a request off localhost, as in every spec; no backend and no database
 * ran. What each screen says is checked before it is saved. The test counts, the API tests' names
 * and the initial total are what the runners and the build printed, captured with `capture()`.
 * Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/05-slice-2-1-join-with-valid-details` runs it.
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

const takes: [Size, Theme][] = [
  ["XS", "light"],
  ["XL", "light"],
  ["XL", "dark"],
];
const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

/** Answers the session; join waits for `answered` when one is given. */
function answer(api: ApiHandlers, answered?: Promise<void>): unknown[] {
  const sent: unknown[] = [];
  api.on("POST", "/api/account/join", async (request) => {
    sent.push(request.postDataJSON());
    await answered;
    return { status: 201, json: SESSION };
  });
  api.on("GET", "/api/session", () => ({ json: SESSION }));
  return sent;
}

test("join and home", async ({ page, api }) => {
  answer(api);
  const join = new WebJoinPage(page);
  const home = new WebHomePage(page);
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await join.open();
    await join.fill(GRACE);
    await join.choose("Running", "Strength");
    await expect(join.interest("Strength")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await join.fullName.blur();
    await shot(page, name("join", size, theme));

    await home.open();
    await expect(home.greeting).toHaveText("Welcome, Grace");
    await shot(page, name("home", size, theme));
  }

  await frame(page, "XL", "light");
  await join.open();
  await expect(join.homeChurch).toHaveAccessibleDescription(
    "Optional — helps you find people nearby",
  );
  await detail(join.field("Home church"), "web-join-church", 12);
  await detail(join.interestPicker, "web-join-interests", 12);
});

test("submitting", async ({ page, api }) => {
  let release!: () => void;
  const sent = answer(api, new Promise<void>((resolve) => (release = resolve)));
  const join = new WebJoinPage(page);
  const home = new WebHomePage(page);

  await frame(page, "XL", "light");
  await join.open();
  await join.fill({ ...GRACE, homeChurch: "" });
  await join.choose("Running", "Strength");
  await join.submit();
  await expect(join.submitButton).toHaveText("Creating your profile…");
  await expect(join.submitButton).toBeDisabled();
  await shot(page, "web-join-submitting-xl-light");
  await detail(join.submitButton, "web-join-busy", 12);

  release();
  await expect(home.greeting).toHaveText("Welcome, Grace");
  expect(sent).toEqual([
    {
      fullName: "Grace Thompson",
      email: "grace.thompson@gmail.com",
      password: "abundantlife",
      homeChurch: null,
      interests: ["running", "strength"],
    },
  ]);
  capture("sent", sent[0]);
});

test("a 5xx while Home loads", async ({ page, api }) => {
  api.on("GET", "/api/session", () => ({
    status: 500,
    json: { status: 500, code: "server_error", reference: "CF-4BF92F35" },
  }));
  const home = new WebHomePage(page);
  const serverError = new WebServerErrorPage(page);

  await frame(page, "XL", "light");
  await home.open();
  await expect(serverError.heading).toHaveText("Something went wrong");
  await expect(serverError.text).toContainText("quote reference CF-4BF92F35.");
  expect(serverError.location()).toBe("/home");
  await shot(page, "web-home-server-error-xl-light");
});

test("what the runners and the build say", () => {
  test.setTimeout(240_000);
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
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    // A theory's rows print once each; the film names the test once.
    join: [
      ...new Set(
        [
          ...api.matchAll(
            /Passed ChristianFitness\.Api\.Tests\.Account\.JoinTests\.(\w+)/g,
          ),
        ].map((m) => m[1].replaceAll("_", " ")),
      ),
    ],
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
