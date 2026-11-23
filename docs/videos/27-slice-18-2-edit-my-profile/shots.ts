import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, test, type ApiHandlers, type ApiReply, SIGNED_IN } from "../../../frontend/e2e/fixtures/test";
import { FULL_PROFILE, NEW_PROFILE, TODAY } from "../../../frontend/e2e/fixtures/profiles";
import { WebEditProfileDialog } from "../../../frontend/e2e/page-objects/web/edit-profile.dialog";
import { WebProfilePage } from "../../../frontend/e2e/page-objects/web/profile.page";
import { capture, detail, frame, shot, type Size, type Theme } from "../../../tools/video-record/shots";

/**
 * The screenshots of video 27: slice 18.2, Edit my profile, in the running member app. Each screen
 * and the dialog are opened through their page objects with the shared fixture, which answers
 * every /api request (the session, `GET /api/profile/me` with the e2e profiles, each save with the
 * profile as saved, a held answer, a 400, a 503) and fails the take on a page error or a request
 * off localhost, as in every spec; no backend and no database ran. What each state says is checked
 * before it is saved. The counts, the API tests' names and the initial total are what the runners
 * and the build printed, captured with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/27-slice-18-2-edit-my-profile` runs it.
 */

const root = path.resolve(__dirname, "..", "..", "..");
const SAVE_PATH = `/api/members/${SIGNED_IN.memberId}/profile`;
const name = (state: string, size: Size, theme: Theme) => `web-${state}-${size.toLowerCase()}-${theme}`;

/** Grace's profile as saved in the film: a new city, her church shown, one more goal. */
const SAVED = {
  ...FULL_PROFILE,
  name: "Grace T. Thompson",
  city: "Scarborough, ON",
  showHomeChurch: true,
  goals: [...FULL_PROFILE.goals, "Run with the Sunrise 5K Crew"],
  interests: [...FULL_PROFILE.interests, "cycling"],
};
const LONG_BIO =
  `${FULL_PROFILE.bio} Sundays I walk with my sister after church, and on weekdays I squeeze in ` +
  "a run before the kids wake up. Looking for people to train with this spring and summer, and " +
  "for a walking group on Sunday afternoons.";
const SIX_GOALS = [...FULL_PROFILE.goals, "Run with the Sunrise 5K Crew every week", "Try a retreat", "Learn to swim"];

function problem(status: number, code: string): ApiReply {
  return { status, headers: { "content-type": "application/problem+json" }, json: { status, code } };
}

function answer(api: ApiHandlers, profile: unknown, save: ApiReply = { json: SAVED }): void {
  api.on("GET", "/api/profile/me", () => ({ json: profile }));
  api.on("PUT", SAVE_PATH, () => save);
}

/** Fills in the film's edit: the full name, the city, the church shown, a goal and Cycling. */
async function edit(dialog: WebEditProfileDialog): Promise<void> {
  await dialog.name.fill("Grace T. Thompson");
  await dialog.city.fill("Scarborough, ON");
  await dialog.showHomeChurch.check();
  await dialog.goals.fill(SAVED.goals.join("\n"));
  await dialog.interest("Cycling").click();
}

test("Edit profile opens the dialog with the current values", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  answer(api, FULL_PROFILE);
  const profile = new WebProfilePage(page);
  const dialog = new WebEditProfileDialog(page);

  await frame(page, "XL", "light");
  await profile.open();
  await expect(profile.editButton).toHaveText("Edit profile");
  await detail(profile.hero, "web-hero", 20);

  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await profile.open();
    await profile.editButton.click();
    await expect(dialog.name).toBeFocused();
    await expect(dialog.name).toHaveValue("Grace Thompson");
    await expect(dialog.showHomeChurch).not.toBeChecked();
    await shot(page, name("dialog", size, theme));
  }
  await frame(page, "XL", "light");
  await profile.open();
  await profile.editButton.click();
  await dialog.showHomeChurch.check();
  await expect(dialog.fieldHint("Home church")).toHaveText("Hidden from other members unless you show it");
  await detail(dialog.churchFields, "web-church", 20);
  await detail(dialog.showHomeChurchRow, "web-show-church", 20);
});

test("a new profile's Add a bio", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  answer(api, NEW_PROFILE);
  const profile = new WebProfilePage(page);
  const dialog = new WebEditProfileDialog(page);

  await frame(page, "XL", "light");
  await profile.open();
  await expect(profile.addBioButton).toHaveText("Add a bio");
  await detail(profile.addBioButton.locator("xpath=ancestor::div[contains(@class,'empty-inline')][1]"), "web-add-bio", 20);
  await frame(page, "XS", "light");
  await profile.open();
  await profile.addBioButton.click();
  await expect(dialog.bio).toHaveValue("");
  await shot(page, name("add-bio", "XS", "light"));
});

test("saving, and the profile as saved", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  answer(api, FULL_PROFILE);
  api.on("PUT", SAVE_PATH, async () => {
    await released;
    return { json: SAVED };
  });
  const profile = new WebProfilePage(page);
  const dialog = new WebEditProfileDialog(page);

  await frame(page, "XL", "light");
  await profile.open();
  await profile.editButton.click();
  await edit(dialog);
  await dialog.saveAndAwaitRequest();
  await expect(dialog.saveButton).toHaveText("Saving…");
  await detail(dialog.saveButton.locator("xpath=ancestor::div[contains(@class,'dialog__foot')]"), "web-saving", 20);
  release();
  await expect(dialog.dialog).toHaveCount(0);
  await expect(profile.heading).toHaveText("Grace T. Thompson");

  api.on("GET", "/api/profile/me", () => ({ json: SAVED }));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await profile.open();
    await expect(profile.facts).toHaveText(["Grace Fellowship, Scarborough", "Scarborough, ON"]);
    await expect(profile.goals).toHaveCount(4);
    await shot(page, name("saved", size, "light"));
  }
});

test("the dialog names each field to fix", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  answer(api, FULL_PROFILE);
  const profile = new WebProfilePage(page);
  const dialog = new WebEditProfileDialog(page);
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await profile.open();
    await profile.editButton.click();
    await dialog.name.fill("");
    await dialog.bio.fill(LONG_BIO);
    await dialog.goals.fill(SIX_GOALS.join("\n"));
    await dialog.saveButton.click();
    await expect(dialog.alertLinks).toHaveText([
      "Enter your name so people know who you are",
      "Keep your bio to 300 characters",
      "Choose up to 5 goals",
    ]);
    await shot(page, name("limits", size, "light"));
    if (size === "XL") {
      await detail(dialog.alert, "web-limits-alert", 20);
      capture("limits", { items: await dialog.alertLinks.allTextContents() });
    }
  }
});

test("a save that does not go through", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  const profile = new WebProfilePage(page);
  const dialog = new WebEditProfileDialog(page);
  await frame(page, "XL", "light");

  answer(api, FULL_PROFILE, problem(400, "field_too_long"));
  await profile.open();
  await profile.editButton.click();
  await edit(dialog);
  await dialog.saveAndAwaitAnswer();
  await expect(dialog.alertText).toHaveText("Some of your changes weren't accepted. Check each field and try again.");
  await expect(dialog.city).toHaveValue("Scarborough, ON");
  await shot(page, name("refused", "XL", "light"));
  await detail(dialog.alert, "web-refused", 20);

  answer(api, FULL_PROFILE, problem(503, "server_error"));
  await frame(page, "XS", "light");
  await profile.open();
  await profile.editButton.click();
  await edit(dialog);
  await dialog.saveAndAwaitAnswer();
  await expect(dialog.alertTitle).toHaveText("We couldn't save your changes");
  await expect(dialog.name).toHaveValue("Grace T. Thompson");
  await shot(page, name("failed", "XS", "light"));
  await frame(page, "XL", "light");
  await profile.open();
  await profile.editButton.click();
  await dialog.saveAndAwaitAnswer();
  await expect(dialog.alertTitle).toHaveText("We couldn't save your changes");
  await detail(dialog.alert, "web-failed", 20);
});

test("what the runners and the build say", () => {
  test.setTimeout(600_000);
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
  const edit = names("EditProfileTests");
  const refusals = names("EditProfileRefusalTests");
  expect(edit.length).toBeGreaterThan(0);
  expect(refusals.length).toBeGreaterThan(0);
  capture("backend", { command: "dotnet test", passed: totals.reduce((a, b) => a + b, 0), edit, refusals });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  const dialog = /edit-profile-dialog\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  expect(dialog, build).not.toBeNull();
  capture("build", {
    command: "npx ng build web",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
    dialog: Number(dialog![1]),
  });
});
