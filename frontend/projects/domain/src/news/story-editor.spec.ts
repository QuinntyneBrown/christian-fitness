import { TestBed } from '@angular/core/testing';
import {
  ADMIN_STORIES_SERVICE,
  type AdminStoriesApi,
  type AdminStoryDto,
  type StorySaveDto,
  type StoryScheduleDto,
} from '@cf/api';
import { of, Subject, throwError, type Observable } from 'rxjs';
import {
  BLANK_STORY,
  STORY_AUTOSAVE_MS,
  StoryEditorStore,
  storyCenterCrop,
  storyPointerOf,
  storyPointerOptions,
  storyPointerValue,
} from './story-editor';

const DRAFT: AdminStoryDto = {
  ...BLANK_STORY,
  id: 's1',
  status: 'draft',
  version: 3,
  headline: 'Pickleball',
  savedAt: '2026-04-14T18:00:00Z',
  publishedAt: null,
  publishAt: null,
};

/** A stories API whose saves answer at once with the next version, or as `answer` says. */
function fakeApi(story: AdminStoryDto = DRAFT) {
  const saves: StorySaveDto[] = [];
  const created: unknown[] = [];
  let answer: ((save: StorySaveDto) => Observable<AdminStoryDto>) | null = null;
  let current = story;
  const api: Partial<AdminStoriesApi> = {
    get: () => of(current),
    save: (_id, save) => {
      saves.push(save);
      return answer
        ? answer(save)
        : of({ ...current, ...save, version: save.version + 1, savedAt: 'saved' });
    },
    create: (fields) => {
      created.push(fields);
      return of({ ...current, ...fields, id: 'new-id', version: 1 });
    },
    options: () => of({ bylines: [], events: [], listings: [] }),
  };
  return {
    api,
    saves,
    created,
    answer: (next: typeof answer) => (answer = next),
    serve: (next: AdminStoryDto) => (current = next),
  };
}

function storeWith(api: Partial<AdminStoriesApi>): StoryEditorStore {
  TestBed.configureTestingModule({
    providers: [StoryEditorStore, { provide: ADMIN_STORIES_SERVICE, useValue: api }],
  });
  return TestBed.inject(StoryEditorStore);
}

// L2-069 AC11, AC12 (ADR 0097): a Draft or a story In review is saved 2 seconds after the last
// edit, over the version last read; a Published story is not; a failed save keeps the fields; a
// save over a newer version stops saving until the Admin chooses. A fake clock moves time.
describe('StoryEditorStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('saves 2 seconds after the last edit, each edit restarting the pause', () => {
    const fake = fakeApi();
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ summary: 'One' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS - 1);
    store.edit({ summary: 'One two' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS - 1);
    expect(fake.saves).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(fake.saves).toEqual([
      { ...BLANK_STORY, headline: 'Pickleball', summary: 'One two', version: 3 },
    ]);
    expect([store.saveState(), store.savedAt()]).toEqual(['idle', 'saved']);
  });

  it('saves the next edit over the version the last save answered', () => {
    const fake = fakeApi();
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ summary: 'One' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    store.edit({ summary: 'Two' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    expect(fake.saves.map((save) => save.version)).toEqual([3, 4]);
  });

  it('saves once more after a save under way when edits came meanwhile', () => {
    const fake = fakeApi();
    const answers = new Subject<AdminStoryDto>();
    fake.answer(() => answers);
    const store = storeWith(fake.api);
    store.open('s1');
    store.edit({ summary: 'One' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    store.edit({ summary: 'Two' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    expect(fake.saves).toHaveLength(1);
    fake.answer(null);

    answers.next({ ...DRAFT, version: 4 });

    expect(fake.saves.map((save) => [save.summary, save.version])).toEqual([
      ['One', 3],
      ['Two', 4],
    ]);
  });

  it.each(['published', 'scheduled'] as const)(
    'never saves a %s story as it is typed',
    (status) => {
      const fake = fakeApi({ ...DRAFT, status });
      const store = storeWith(fake.api);
      store.open('s1');

      store.edit({ summary: 'Changed' });
      vi.advanceTimersByTime(STORY_AUTOSAVE_MS * 5);

      expect([fake.saves, store.fields().summary]).toEqual([[], 'Changed']);
    },
  );

  it('creates a new story on its first save and tells the screen its id', () => {
    const fake = fakeApi();
    const store = storeWith(fake.api);
    const ids: string[] = [];
    store.openNew((id) => ids.push(id));

    store.edit({ headline: 'First words' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    store.edit({ headline: 'First words, more' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    expect(fake.created).toEqual([{ ...BLANK_STORY, headline: 'First words' }]);
    expect(ids).toEqual(['new-id']);
    expect(fake.saves.map((save) => [save.headline, save.version])).toEqual([
      ['First words, more', 1],
    ]);
  });

  it('keeps the fields when a save fails, and saves again on the next edit', () => {
    const fake = fakeApi();
    fake.answer(() => throwError(() => ({ status: 503, code: 'error' })));
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ text: 'Kept' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    expect([store.saveState(), store.fields().text]).toEqual(['failed', 'Kept']);
    fake.answer(null);
    store.edit({ text: 'Kept, and more' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    expect(store.saveState()).toBe('idle');
  });

  it('stops saving on story_changed until the Admin loads the newer version', () => {
    const fake = fakeApi();
    fake.answer(() => throwError(() => ({ status: 409, code: 'story_changed' })));
    const store = storeWith(fake.api);
    store.open('s1');
    store.edit({ headline: 'Mine' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    store.edit({ headline: 'Mine, still' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    expect([store.saveState(), store.fields().headline, fake.saves.length]).toEqual([
      'conflict',
      'Mine, still',
      1,
    ]);
    fake.serve({ ...DRAFT, version: 5, headline: 'Theirs' });

    store.loadNewer();

    expect([store.saveState(), store.fields().headline]).toEqual(['idle', 'Theirs']);
  });

  it('keeps what was typed over the newer version when the Admin chooses to', () => {
    const fake = fakeApi();
    fake.answer(() => throwError(() => ({ status: 409, code: 'story_changed' })));
    const store = storeWith(fake.api);
    store.open('s1');
    store.edit({ headline: 'Mine' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);
    fake.answer(null);
    fake.serve({ ...DRAFT, version: 5, headline: 'Theirs' });

    store.keepMine();

    expect(fake.saves.map((save) => [save.headline, save.version])).toEqual([
      ['Mine', 3],
      ['Mine', 5],
    ]);
    expect([store.saveState(), store.fields().headline]).toEqual(['idle', 'Mine']);
  });

  it.each<[number, string]>([
    [404, 'missing'],
    [503, 'failed'],
  ])('a story answered %s is %s', (status, load) => {
    const store = storeWith({ get: () => throwError(() => ({ status, code: 'x' })) });

    store.open('s1');

    expect(store.load()).toBe(load);
  });

  it('keeps reading the choices while the story opens', () => {
    const fake = fakeApi();
    const choices = new Subject<{
      bylines: { id: string; name: string }[];
      events: [];
      listings: [];
    }>();
    const store = storeWith({ ...fake.api, options: () => choices });
    store.loadOptions();

    store.open('s1');
    choices.next({ bylines: [{ id: 'b1', name: 'Priya Raman' }], events: [], listings: [] });

    expect(store.options()?.bylines).toEqual([{ id: 'b1', name: 'Priya Raman' }]);
  });

  it('lets its pause and clock go when the screen ends', () => {
    const fake = fakeApi();
    const store = storeWith(fake.api);
    store.open('s1');
    store.edit({ summary: 'Pending' });

    store.ngOnDestroy();
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS * 30);

    expect([fake.saves, vi.getTimerCount()]).toEqual([[], 0]);
  });
});

describe('story pointers', () => {
  it('offers Nothing, the events, then the listings, as the mock words them', () => {
    expect(
      storyPointerOptions({
        bylines: [],
        events: [{ id: 'e1', title: 'Easter Sunrise 5K' }],
        listings: [{ id: 'l1', name: 'Lena Park, RD' }],
      }),
    ).toEqual([
      { value: '', label: 'Nothing' },
      { value: 'event:e1', label: 'Event · Easter Sunrise 5K' },
      { value: 'listing:l1', label: 'Listing · Lena Park, RD' },
    ]);
  });

  it.each<[string, unknown]>([
    ['', null],
    ['event:e1', { kind: 'event', id: 'e1' }],
    ['listing:l1', { kind: 'listing', id: 'l1' }],
    ['venue:v1', null],
    ['event:', null],
  ])('reads "%s" as %j', (value, pointer) => {
    expect(storyPointerOf(value)).toEqual(pointer);
  });

  it('writes a pointer back as its value', () => {
    expect([storyPointerValue(null), storyPointerValue({ kind: 'event', id: 'e1' })]).toEqual([
      '',
      'event:e1',
    ]);
  });
});

// L2-069 AC2, AC3, AC7, AC12 (ADR 0097): a status action acts on what was typed, over the version
// read; Publish refused for its fields marks them until each is edited.
describe('StoryEditorStore actions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  function withActions(fake: ReturnType<typeof fakeApi>) {
    const asked: { action: string; version: number; save?: StorySaveDto }[] = [];
    let refuse: { code: string; fieldCodes?: Record<string, string>; status: number } | null = null;
    const answer = (
      action: string,
      version: number,
      status: AdminStoryDto['status'],
      save?: StorySaveDto,
    ) => {
      asked.push(save ? { action, version, save } : { action, version });
      return refuse
        ? throwError(() => refuse)
        : of({ ...DRAFT, ...(save ?? {}), status, version: version + 1 });
    };
    Object.assign(fake.api, {
      submit: (_id: string, version: number) => answer('submit', version, 'review'),
      returnToDraft: (_id: string, version: number) => answer('return-to-draft', version, 'draft'),
      publish: (_id: string, save: StorySaveDto) =>
        answer('publish', save.version, 'published', save),
    });
    return { asked, refuse: (next: typeof refuse) => (refuse = next) };
  }

  it('saves edits not yet saved before sending for review, then acts over the saved version', () => {
    const fake = fakeApi();
    const actions = withActions(fake);
    const store = storeWith(fake.api);
    store.open('s1');
    const acted: unknown[] = [];

    store.edit({ summary: 'Typed just now' });
    store.act('submit', (done) => acted.push(done));

    expect(fake.saves.map((save) => [save.summary, save.version])).toEqual([['Typed just now', 3]]);
    expect(actions.asked).toEqual([{ action: 'submit', version: 4 }]);
    expect([store.status(), store.saveState(), acted]).toEqual([
      'review',
      'idle',
      [{ action: 'submit', from: 'draft' }],
    ]);
  });

  it('publishes the fields as typed over the version read, with no save first', () => {
    const fake = fakeApi();
    const actions = withActions(fake);
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ headline: 'Ready' });
    store.act('publish', () => undefined);
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    expect(fake.saves).toEqual([]);
    expect(actions.asked).toEqual([
      { action: 'publish', version: 3, save: { ...BLANK_STORY, headline: 'Ready', version: 3 } },
    ]);
    expect(store.status()).toBe('published');
  });

  it('marks the fields Publish refused until each is edited, and keeps the status', () => {
    const fake = fakeApi();
    const actions = withActions(fake);
    actions.refuse({
      status: 400,
      code: 'validation_failed',
      fieldCodes: { headline: 'headline_required', section: 'section_required' },
    });
    const store = storeWith(fake.api);
    store.open('s1');

    store.act('publish', () => undefined);
    expect([store.saveState(), store.status(), store.fieldCodes()]).toEqual([
      'invalid',
      'draft',
      { headline: 'headline_required', section: 'section_required' },
    ]);

    store.edit({ headline: 'Now written' });
    expect(store.fieldCodes()).toEqual({ section: 'section_required' });
  });

  it('offers the newer version when an action was refused with story_changed', () => {
    const fake = fakeApi();
    const actions = withActions(fake);
    actions.refuse({ status: 409, code: 'story_changed' });
    const store = storeWith(fake.api);
    store.open('s1');

    store.act('submit', () => undefined);

    expect([store.saveState(), store.status(), store.acting()]).toEqual([
      'conflict',
      'draft',
      null,
    ]);
  });

  it('takes no edit while an action runs', () => {
    const fake = fakeApi();
    const pending = new Subject<AdminStoryDto>();
    Object.assign(fake.api, { submit: () => pending });
    const store = storeWith(fake.api);
    store.open('s1');

    store.act('submit', () => undefined);
    store.edit({ headline: 'Changed meanwhile' });

    expect([store.acting(), store.fields().headline]).toEqual(['submit', 'Pickleball']);
  });
});

// L2-069 AC2, AC4, AC7 (ADR 0104): When is "As soon as it's published" until Schedule is chosen;
// Schedule sends the fields with the Toronto date and time; a Scheduled story opens with its time
// chosen and Unschedule sends only the version; a refused date or time is marked until edited.
describe('StoryEditorStore scheduling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  const SCHEDULED: AdminStoryDto = {
    ...DRAFT,
    status: 'scheduled',
    publishAt: '2026-04-18T10:00:00Z',
  };

  function withScheduling(fake: ReturnType<typeof fakeApi>) {
    const asked: unknown[] = [];
    let refusal: unknown = null;
    Object.assign(fake.api, {
      schedule: (_id: string, save: StoryScheduleDto) => {
        asked.push(['schedule', save]);
        return refusal
          ? throwError(() => refusal)
          : of({
              ...DRAFT,
              status: 'scheduled',
              version: save.version + 1,
              publishAt: '2026-04-18T10:00:00Z',
            });
      },
      unschedule: (_id: string, version: number) => {
        asked.push(['unschedule', version]);
        return of({ ...DRAFT, version: version + 1 });
      },
    });
    return { asked, refuse: (next: unknown) => (refusal = next) };
  }

  it('starts with the story going out as soon as it is published, and no date or time', () => {
    const store = storeWith(fakeApi().api);
    store.open('s1');

    expect([store.when(), store.publishDate(), store.publishTime()]).toEqual(['now', '', '']);
  });

  it('schedules the fields as typed with the date and time chosen, saving nothing first', () => {
    const fake = fakeApi();
    const scheduling = withScheduling(fake);
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ headline: 'Ready' });
    store.chooseWhen('schedule');
    store.choosePublishDate('2026-04-18');
    store.choosePublishTime('06:00');
    store.act('schedule', () => undefined);
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    expect(fake.saves).toEqual([]);
    expect(scheduling.asked).toEqual([
      [
        'schedule',
        {
          ...BLANK_STORY,
          headline: 'Ready',
          version: 3,
          publishDate: '2026-04-18',
          publishTime: '06:00',
        },
      ],
    ]);
    expect([store.status(), store.publishAt(), store.when()]).toEqual([
      'scheduled',
      '2026-04-18T10:00:00Z',
      'schedule',
    ]);
  });

  it('opens a Scheduled story with its Toronto date and time, and Unschedule sends its version', () => {
    const fake = fakeApi(SCHEDULED);
    const scheduling = withScheduling(fake);
    const store = storeWith(fake.api);
    store.open('s1');

    expect([store.when(), store.publishDate(), store.publishTime()]).toEqual([
      'schedule',
      '2026-04-18',
      '06:00',
    ]);

    store.act('unschedule', () => undefined);

    expect(scheduling.asked).toEqual([['unschedule', 3]]);
    expect([store.status(), store.when(), store.publishDate(), store.publishTime()]).toEqual([
      'draft',
      'now',
      '',
      '',
    ]);
  });

  it('never saves a Scheduled story as it is typed', () => {
    const fake = fakeApi(SCHEDULED);
    const store = storeWith(fake.api);
    store.open('s1');

    store.edit({ summary: 'Changed' });
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS * 2);

    expect(fake.saves).toEqual([]);
  });

  it('marks a refused date until it is chosen again', () => {
    const fake = fakeApi();
    const scheduling = withScheduling(fake);
    scheduling.refuse({
      status: 400,
      code: 'validation_failed',
      fieldCodes: { publishDate: 'publish_at_in_past', publishTime: 'publish_time_required' },
    });
    const store = storeWith(fake.api);
    store.open('s1');
    store.chooseWhen('schedule');

    store.act('schedule', () => undefined);
    expect([store.saveState(), store.status()]).toEqual(['invalid', 'draft']);

    store.choosePublishDate('2026-04-16');
    expect(store.fieldCodes()).toEqual({ publishTime: 'publish_time_required' });
    store.choosePublishTime('09:00');
    expect(store.fieldCodes()).toEqual({});
  });
});

// L2-069 AC9 (ADR 0097): the largest 16:9 rectangle at the image's centre, in whole pixels inside it.
describe('storyCenterCrop', () => {
  it.each([
    [1600, 900, { x: 0, y: 0, width: 1600, height: 900 }],
    [2000, 1500, { x: 0, y: 188, width: 2000, height: 1125 }],
    [3200, 1600, { x: 178, y: 0, width: 2844, height: 1600 }],
    [1600, 2400, { x: 0, y: 750, width: 1600, height: 900 }],
    [1601, 900, { x: 1, y: 0, width: 1600, height: 900 }],
    [1700, 950, { x: 6, y: 0, width: 1688, height: 950 }],
  ])('%i by %i', (width, height, crop) => {
    expect(storyCenterCrop(width, height)).toEqual(crop);
  });
});

// L2-069 AC9: an uploaded image becomes the story's, cropped at its centre and saved as an edit.
describe('StoryEditorStore lead image', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('takes the uploaded image with its centre crop and saves it once typing pauses', () => {
    const fake = fakeApi();
    Object.assign(fake.api, {
      uploadImage: () => of({ imageKey: 'k.jpg', width: 2000, height: 1500 }),
    });
    const store = storeWith(fake.api);
    store.open('s1');

    store.addImage(new File([], 'lead.jpg'));
    vi.advanceTimersByTime(STORY_AUTOSAVE_MS);

    const image = { key: 'k.jpg', crop: { x: 0, y: 188, width: 2000, height: 1125 } };
    expect([store.imageUpload(), store.fields().image, fake.saves.map((s) => s.image)]).toEqual([
      'idle',
      image,
      [image],
    ]);
  });

  it.each([
    [{ status: 400, code: 'validation_failed', fieldCodes: { image: 'image_invalid' } }, 'invalid'],
    [{ status: 0, code: 'network' }, 'failed'],
  ])('keeps the image it had when the upload is refused with %j', (error, state) => {
    const fake = fakeApi();
    Object.assign(fake.api, { uploadImage: () => throwError(() => error) });
    const store = storeWith(fake.api);
    store.open('s1');

    store.addImage(new File([], 'lead.jpg'));

    expect([store.imageUpload(), store.fields().image]).toEqual([state, null]);
  });
});
