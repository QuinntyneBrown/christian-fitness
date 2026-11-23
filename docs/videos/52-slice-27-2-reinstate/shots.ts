import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  answerMembers,
  CAST_MEMBERS,
  type AdminMemberFixture,
} from "../../../frontend/e2e/fixtures/admin-members";
import { expect, test, type ApiHandlers } from "../../../frontend/e2e/fixtures/test";
import { AdminMembersPage } from "../../../frontend/e2e/page-objects/admin/members.page";
import { ModerateMemberDialog } from "../../../frontend/e2e/page-objects/admin/moderate-member.dialog";
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
 * The screenshots of video 52: slice 27.2, Reinstate, in the running admin app. Each
 * screen is opened through its page objects with the shared fixture, which answers every /api
 * request (Dana's staff session; the seven members of the mocks' cast; a reinstatement
 * changing the member and answering their row, as the API does) and fails the take on a page
 * error or a request off localhost, as in every spec; no backend and no database ran. What each
 * screen says is checked before it is saved. The requests the dialog sent, the test counts and
 * the bundle sizes are what the fixture recorded and the runners and the build printed, captured
 * with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/52-slice-27-2-reinstate` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

const KEVIN = CAST_MEMBERS[3]!;
const TYLER = CAST_MEMBERS[6]!;

/** Answers the list and each flag or suspend from a copy of the cast; records what was sent. */
function answerModeration(api: ApiHandlers): { path: string; body: unknown }[] {
  const members: AdminMemberFixture[] = CAST_MEMBERS.map((m) => ({ ...m }));
  const sent: { path: string; body: unknown }[] = [];
  answerMembers(api, members, 2431);
  api.on("POST", /^\/api\/admin\/members\/[^/]+\/reinstate$/, (request) => {
    const pathname = new URL(request.url()).pathname;
    const id = pathname.split("/")[4]!;
    sent.push({ path: pathname.replace(id, "{id}"), body: request.postDataJSON() });
    const member = members.find((m) => m.id === id)!;
    member.status = "active";
    member.note = null;
    return { json: member };
  });
  return sent;
}

test("a Flagged member reinstated", async ({ page, api }) => {
  const sent = answerModeration(api);
  const members = new AdminMembersPage(page);
  const dialog = new ModerateMemberDialog(page);

  await frame(page, "XL", "light");
  await members.open();
  await expect(members.moderateButtons()).toHaveCount(7);
  await shot(page, name("members", "XL", "light"));
  await detail(members.rows.nth(3), "admin-members-kevin-flagged-row", 0);

  await members.moderateButton(KEVIN.name).click();
  await expect(dialog.dialog).toHaveAccessibleName("Moderate Kevin Brooks");
  await expect(dialog.reinstateChoice).toBeChecked();
  await expect(dialog.note).toHaveCount(0);
  await dialog.reinstateChoice.blur();
  await shot(page, name("moderate-flagged", "XL", "light"));
  await dialog.submitButton.click();

  await expect(dialog.dialog).toHaveCount(0);
  await expect(members.toastTitle).toHaveText("Kevin Brooks reinstated");
  expect((await members.rowTexts())[3]?.[5]).toBe("Active");
  expect((await members.notes())[3]).toBe("");
  await shot(page, name("members-after-flagged", "XL", "light"));
  await detail(members.rows.nth(3), "admin-members-kevin-active-row", 0);
  capture("reinstate", sent[0]);
});

test("a Suspended member reinstated", async ({ page, api }) => {
  const sent = answerModeration(api);
  const members = new AdminMembersPage(page);
  const dialog = new ModerateMemberDialog(page);

  await frame(page, "XL", "light");
  await members.open();
  await members.moderateButton(TYLER.name).click();
  await expect(dialog.dialog).toHaveAccessibleName("Reinstate Tyler Simmons");
  await expect(dialog.dialog).toBeFocused();
  await expect(dialog.actions).toHaveCount(0);
  await expect(dialog.info).toContainText("Tyler Simmons will be able to sign in again");
  await shot(page, name("moderate-suspended", "XL", "light"));
  await dialog.submitButton.click();

  await expect(dialog.dialog).toHaveCount(0);
  await expect(members.toastTitle).toHaveText("Tyler Simmons reinstated");
  await expect(members.toastText).toHaveText("They are Active again and can sign in.");
  expect((await members.rowTexts())[6]?.[5]).toBe("Active");
  expect(sent).toHaveLength(1);
  await shot(page, name("members-after-suspended", "XL", "light"));
  await detail(members.toast, "admin-reinstated-toast", 16);

  await frame(page, "XS", "light");
  await members.open();
  await members.moderateButton(KEVIN.name).click();
  await expect(dialog.reinstateChoice).toBeChecked();
  await shot(page, name("moderate-flagged", "XS", "light"));

  await frame(page, "XL", "dark");
  await members.open();
  await members.moderateButton(KEVIN.name).click();
  await expect(dialog.reinstateChoice).toBeChecked();
  await shot(page, name("moderate-flagged", "XL", "dark"));
});

test("what the runners and the build say", () => {
  test.setTimeout(600_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  const unitCounts = [...unit.matchAll(/Tests\s+(\d+) passed \((\d+)\)/g)].map((m) => Number(m[1]));
  expect(unitCounts.length, unit).toBe(2);
  capture("unit", { command: "npm test", passed: unitCounts.reduce((a, b) => a + b, 0) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]) });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const moderation = (api.match(/Passed ChristianFitness\.\w+\.Tests\.Members\.(ReinstateMemberTests|MemberModerationTests)\./g) ?? []).length;
  expect(moderation).toBeGreaterThan(15);
  capture("backend", { command: "dotnet test", passed: totals.reduce((a, b) => a + b, 0), moderation });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  const dialogChunk = /moderate-member-dialog\s*\|\s*([\d.]+) kB/.exec(build);
  expect(dialogChunk, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    dialog: Number(dialogChunk![1]),
  });
});
