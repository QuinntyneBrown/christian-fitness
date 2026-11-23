import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  type ApiHandlers,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { AdminStaffSignInPage } from "../../../frontend/e2e/page-objects/admin/staff-sign-in.page";
import { AdminTwoStepPage } from "../../../frontend/e2e/page-objects/admin/two-step.page";
import {
  ADMIN_URL,
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The pictures of video 13: slice 29.2, Audit staff changes. The slice has no screen of its own:
 * it audits the staff commands behind two screens that exist, the code that starts a staff session
 * and the shell's Sign out. Those are screenshots of the running admin app, opened through the page
 * objects with the shared fixture answering every /api request and failing the take on a page error
 * or a request off localhost, as in every spec; no backend and no database ran for them. What the
 * backend does is what its own runners printed, captured with `capture()`: the audit tests that
 * passed, the backend totals, and the SQL of the migration that adds the audit trail. Not a test
 * and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/13-slice-29-2-audit-staff-changes` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const EMAIL = "dana@christianfitness.ca";
const PASSWORD = "abundantlife";

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code, title: "A sentence from the server the screen never shows" },
  };
}

/** Signed out, a password step answered with a pending sign-in, and each code with `reply`. */
function pendingSignIn(api: ApiHandlers, reply: () => ApiReply): void {
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/admin/session", () => ({ status: 202 }));
  api.on("POST", "/api/admin/session/two-step", reply);
}

async function reachCodeScreen(page: AdminStaffSignInPage, twoStep: AdminTwoStepPage) {
  await page.open();
  await page.fill(EMAIL, PASSWORD);
  await page.submit();
  await expect(twoStep.heading).toHaveText("Enter your code");
}

test("the code that starts a staff session, and the Sign out that ends it", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const twoStep = new AdminTwoStepPage(page);
  const shell = new AdminShell(page);
  for (const [size, theme] of [
    ["XL", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ] as [Size, Theme][]) {
    pendingSignIn(api, () => {
      api.on("GET", "/api/admin/session", () => ({ json: STAFF_SIGNED_IN }));
      return { json: STAFF_SIGNED_IN };
    });
    await frame(page, size, theme);
    await reachCodeScreen(signIn, twoStep);
    await twoStep.fill("492 017");
    await shot(page, name("code", size, theme));
    if (size === "XL" && theme === "light") await detail(twoStep.card, "admin-code-card", 16);
    await twoStep.submit();
    await expect(shell.heading).toHaveText("Dashboard");
    await expect(shell.signOutButton).toBeVisible();
    await shot(page, name("dashboard", size, theme));
    if (size === "XL" && theme === "light") {
      capture("session", { name: await shell.userName.innerText(), role: await shell.userRole.innerText() });
    }
    api.on("DELETE", "/api/admin/session", () => {
      api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
      return { status: 204 };
    });
    await shell.signOut();
    await expect(signIn.heading).toBeVisible();
  }
});

test("a wrong code is refused", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const twoStep = new AdminTwoStepPage(page);
  pendingSignIn(api, () => problem(401, "invalid_code"));
  await frame(page, "XL", "light");
  await reachCodeScreen(signIn, twoStep);
  await twoStep.fill("999999");
  await twoStep.submit();
  await expect(twoStep.codeError).toContainText("doesn't match");
  await shot(page, name("wrong-code", "XL", "light"));
  capture("wrongCode", { error: await twoStep.codeError.innerText() });
});

test("what the backend's runners say", () => {
  test.setTimeout(500_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const backend = path.join(root, "backend");
  const run = (command: string) => {
    const result = spawnSync(command, { cwd: backend, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const all = run('dotnet test --logger "console;verbosity=normal"');
  const totals = [...all.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, all).toBe(2);
  const passed = (cls: string) =>
    [...all.matchAll(new RegExp(`Passed ChristianFitness\\.\\w+\\.Tests\\.\\w+\\.${cls}\\.(\\w+)(\\(why: "([^"]+)")?`, "g"))].map(
      (m) => (m[3] ? `${m[1]}: ${m[3]}` : m[1]),
    );
  const acceptance = passed("StaffAuditTests");
  const telemetry = passed("StaffAuditTelemetryTests");
  const behaviour = passed("AuditBehaviorTests");
  expect(acceptance.length, all).toBe(5);
  expect(telemetry.length, all).toBe(1);
  expect(behaviour.length, all).toBe(7);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    acceptance,
    telemetry,
    behaviour,
  });

  const sql = run(
    "dotnet ef migrations script AddMemberProfile AddAuditEntries --project src/ChristianFitness.Infrastructure --startup-project src/ChristianFitness.Infrastructure",
  );
  const table = /CREATE TABLE "AuditEntries" \(([\s\S]*?)\);/.exec(sql);
  expect(table, sql).not.toBeNull();
  capture("table", {
    command: "dotnet ef migrations script",
    columns: table![1]
      .split("\n")
      .map((line) => line.trim().replace(/,$/, ""))
      .filter((line) => line.startsWith('"')),
  });
});
