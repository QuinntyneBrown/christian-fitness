import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  CAST_EVENTS,
  eventList,
  PUBLISHED_EVENTS,
  RETREAT_DRAFT,
} from "../../../frontend/e2e/fixtures/admin-events";
import { expect, test, type ApiHandlers } from "../../../frontend/e2e/fixtures/test";
import { EventEditorDialog } from "../../../frontend/e2e/page-objects/admin/event-editor.dialog";
import { AdminEventsPage } from "../../../frontend/e2e/page-objects/admin/events.page";
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
 * The screenshots of video 14: slice 10.1, Create a draft event, in the running admin app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (Dana's staff session; the five events of the mocks' cast, or the four published ones
 * until the draft is saved; 201 with Whole Life Retreat for Save draft) and fails the take on a
 * page error or a request off localhost, as in every spec; no backend and no database ran. What
 * each screen says is checked before it is saved. The test counts, the API tests' names and the
 * bundle sizes are what the runners and the build printed, captured with `capture()`. Not a test
 * and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/14-slice-10-1-create-a-draft-event` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

const RETREAT = {
  title: "Whole Life Retreat",
  category: "Retreat",
  date: "2026-05-22",
  startTime: "16:00",
  place: "Muskoka Woods, Rosseau",
  area: "Muskoka Lakes",
  price: "$340",
  capacity: "60",
  summary:
    "Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.",
};

/** Answers each tab from `events`. */
function answerList(api: ApiHandlers, events = CAST_EVENTS): void {
  api.on("GET", "/api/admin/events", (request) => {
    const status = new URL(request.url()).searchParams.get("status");
    const shown =
      status === "published" || status === "draft"
        ? events.filter((e) => e.status === status)
        : events;
    return eventList(shown, events);
  });
}

test("the Events page lists every event, by tab", async ({ page, api }) => {
  answerList(api);
  const events = new AdminEventsPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await events.open();
    await expect(events.rows).toHaveCount(5);
    await expect(events.tabLinks).toHaveText(["All 5", "Published 4", "Draft 1"]);
    await shot(page, name("events", size, theme));
    if (size === "XL" && theme === "light") {
      await detail(events.table, "admin-events-table", 12);
      capture("list", { rows: await events.rowTexts() });
    }
  }

  await frame(page, "M", "light");
  await events.open();
  await events.tab("Draft").click();
  await expect(events.currentTab).toHaveText("Draft 1");
  await expect(events.rows).toHaveCount(1);
  expect(events.location()).toBe("/events?status=draft");
  await shot(page, name("events-draft", "M", "light"));
});

test("a tab with nothing, no events, and a list that does not load", async ({ page, api }) => {
  const events = new AdminEventsPage(page);
  await frame(page, "XL", "light");

  answerList(api, [RETREAT_DRAFT]);
  await events.open("published");
  await expect(events.emptyTitle).toHaveText("Nothing published yet");
  await shot(page, name("events-tab-empty", "XL", "light"));

  answerList(api, []);
  await events.open();
  await expect(events.emptyTitle).toHaveText("No events yet");
  await shot(page, name("events-empty", "XL", "light"));

  api.on("GET", "/api/admin/events", () => ({ abort: true }));
  await events.open();
  await expect(events.errorTitle).toHaveText("Events didn't load");
  await detail(events.error, "admin-events-error", 16);
});

test("New event, Save draft, Saving…, the toast and the draft in the list", async ({
  page,
  api,
}) => {
  let created = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  api.on("GET", "/api/admin/events", () =>
    eventList(created ? [...PUBLISHED_EVENTS, RETREAT_DRAFT] : PUBLISHED_EVENTS),
  );
  const sent: unknown[] = [];
  api.on("POST", "/api/admin/events", async (request) => {
    sent.push(request.postDataJSON());
    await gate;
    created = true;
    return { status: 201, json: RETREAT_DRAFT };
  });
  const events = new AdminEventsPage(page);
  const editor = new EventEditorDialog(page);

  await frame(page, "XS", "light");
  await events.open();
  await events.openNewEvent();
  await expect.poll(() => editor.titleIsFocused()).toBe(true);
  await editor.title.fill(RETREAT.title);
  await shot(page, name("editor", "XS", "light"));
  await editor.closeButton.click();
  await expect(editor.dialog).toHaveCount(0);

  await frame(page, "XL", "light");
  await events.open();
  await events.openNewEvent();
  await expect.poll(() => editor.titleIsFocused()).toBe(true);
  await shot(page, name("editor-new", "XL", "light"));
  await editor.fill(RETREAT);
  await editor.title.blur();
  await shot(page, name("editor", "XL", "light"));

  await editor.saveDraft();
  await expect(editor.saveDraftButton).toHaveText("Saving…");
  await expect(editor.saveDraftButton).toBeDisabled();
  await detail(editor.drawer, "admin-editor-saving", 0);
  capture("sent", sent[0]);
  release();

  await expect(editor.dialog).toHaveCount(0);
  await expect(events.toastTitle).toHaveText("Draft saved");
  await expect(events.toastText).toHaveText("Whole Life Retreat isn't visible to members yet.");
  await expect(events.tabLinks).toHaveText(["All 5", "Published 4", "Draft 1"]);
  await expect(events.rows).toHaveCount(5);
  await events.newEventButton.blur();
  await shot(page, name("saved", "XL", "light"));
  await detail(events.toast, "admin-saved-toast", 16);
});

test("what the runners and the build say", () => {
  test.setTimeout(500_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  const unitCount = /Tests\s+(\d+) passed \((\d+)\)/.exec(unit);
  expect(unitCount, unit).not.toBeNull();
  capture("unit", { command: "npm test", passed: Number(unitCount![1]) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]) });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const count = (cls: string) =>
    new Set(
      [
        ...api.matchAll(
          new RegExp(
            `Passed ChristianFitness\\.\\w+\\.Tests\\.[\\w.]+\\.${cls}\\.([^\\[\\r\\n]+) \\[`,
            "g",
          ),
        ),
      ].map((m) => m[1]),
    ).size;
  const refusals = count("CreateEventRefusalTests");
  expect(refusals).toBeGreaterThan(15);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    create: count("CreateEventTests"),
    refusals,
    list: count("ListAdminEventsTests"),
  });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  const page = /events-page\s*\|\s*([\d.]+) kB/.exec(build);
  const editor = /event-editor-dialog\s*\|\s*([\d.]+) kB/.exec(build);
  expect(page, build).not.toBeNull();
  expect(editor, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
    page: Number(page![1]),
    editor: Number(editor![1]),
  });
});
