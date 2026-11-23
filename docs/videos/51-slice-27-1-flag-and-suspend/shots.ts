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
 * The screenshots of video 51: slice 27.1, Flag and suspend, in the running admin app. Each
 * screen is opened through its page objects with the shared fixture, which answers every /api
 * request (Dana's staff session; the seven members of the mocks' cast; a flag or a suspension
 * changing the member and answering their row, as the API does) and fails the take on a page
 * error or a request off localhost, as in every spec; no backend and no database ran. What each
 * screen says is checked before it is saved. The requests the dialog sent, the test counts and
 * the bundle sizes are what the fixture recorded and the runners and the build printed, captured
 * with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/51-slice-27-1-flag-and-suspend` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

const PRIYA = CAST_MEMBERS[2]!;
const FLAG_NOTE = "Two members asked about messages from this account";
const SUSPEND_NOTE = "Spam messages to the Sunrise 5K group";

/** Answers the list and each flag or suspend from a copy of the cast; records what was sent. */
function answerModeration(api: ApiHandlers): { path: string; body: unknown }[] {
  const members: AdminMemberFixture[] = CAST_MEMBERS.map((m) => ({ ...m }));
  const sent: { path: string; body: unknown }[] = [];
  answerMembers(api, members, 2431);
  api.on("POST", /^\/api\/admin\/members\/[^/]+\/(flag|suspend)$/, (request) => {
    const pathname = new URL(request.url()).pathname;
    const body = request.postDataJSON() as { note: string };
    sent.push({ path: pathname.replace(PRIYA.id, "{id}"), body });
    const [, , , , id, action] = pathname.split("/");
    const member = members.find((m) => m.id === id)!;
    member.status = action === "flag" ? "flagged" : "suspended";
    member.note = body.note;
    return { json: member };
  });
  return sent;
}

test("the rows, then a flag from the dialog", async ({ page, api }) => {
  const sent = answerModeration(api);
  const members = new AdminMembersPage(page);
  const dialog = new ModerateMemberDialog(page);

  await frame(page, "XL", "light");
  await members.open();
  await expect(members.rows).toHaveCount(7);
  await expect(members.moderateButtons()).toHaveCount(6);
  expect((await members.notes())[3]).toBe("Promoting supplements in 3 group chats");
  await shot(page, name("members", "XL", "light"));
  await detail(members.rows.nth(3), "admin-members-flagged-row", 0);

  await members.moderateButton("Priya Nair").click();
  await expect(dialog.dialog).toHaveAccessibleName("Moderate Priya Nair");
  await expect(dialog.flagChoice).toBeChecked();
  await dialog.note.fill(FLAG_NOTE);
  await dialog.note.blur();
  await shot(page, name("moderate-flag", "XL", "light"));
  await dialog.submitButton.click();

  await expect(dialog.dialog).toHaveCount(0);
  await expect(members.toastTitle).toHaveText("Priya Nair flagged");
  expect((await members.rowTexts())[2]?.[5]).toBe("Flagged");
  expect((await members.notes())[2]).toBe(FLAG_NOTE);
  await shot(page, name("members-after-flag", "XL", "light"));
  await detail(members.toast, "admin-flagged-toast", 16);
  await detail(members.rows.nth(2), "admin-members-priya-flagged-row", 0);
  capture("flag", sent[0]);
});

test("a suspension: the choice, what is missing, and the member suspended", async ({
  page,
  api,
}) => {
  const sent = answerModeration(api);
  const members = new AdminMembersPage(page);
  const dialog = new ModerateMemberDialog(page);

  await frame(page, "XL", "light");
  await members.open();
  await members.moderateButton("Priya Nair").click();
  await dialog.suspendChoice.check();
  await dialog.submitButton.click();
  await expect(dialog.alertTitle).toHaveText("2 things to fix");
  await shot(page, name("moderate-invalid", "XL", "light"));

  await dialog.note.fill(SUSPEND_NOTE);
  await dialog.confirmation.check();
  await dialog.confirmation.blur();
  await expect(dialog.alert).toHaveCount(0);
  await shot(page, name("moderate-suspend", "XL", "light"));
  await dialog.submitButton.click();

  await expect(dialog.dialog).toHaveCount(0);
  await expect(members.toastTitle).toHaveText("Priya Nair suspended");
  expect((await members.rowTexts())[2]?.[5]).toBe("Suspended");
  await expect(members.moderateButton("Priya Nair")).toHaveCount(0);
  await shot(page, name("members-after-suspend", "XL", "light"));
  capture("suspend", sent[0]);

  await frame(page, "XS", "light");
  await members.open();
  await members.moderateButton("Kevin Brooks").click();
  await expect(dialog.dialog).toHaveAccessibleName("Suspend Kevin Brooks");
  await expect(dialog.actions).toHaveCount(0);
  await shot(page, name("moderate-flagged", "XS", "light"));

  await frame(page, "XL", "dark");
  await members.open();
  await members.moderateButton("Kevin Brooks").click();
  await expect(dialog.note).toBeFocused();
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
  const moderation = (api.match(/Passed ChristianFitness\.\w+\.Tests\.Members\.(ModerateMemberTests|MemberModerationTests)\./g) ?? []).length;
  expect(moderation).toBeGreaterThan(30);
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
