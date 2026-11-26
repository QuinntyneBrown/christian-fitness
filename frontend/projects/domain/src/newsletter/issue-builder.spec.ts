import { TestBed } from '@angular/core/testing';
import {
  ADMIN_NEWSLETTER_SERVICE,
  type AdminNewsletterApi,
  type DeskStoryDto,
  type IssueFieldsDto,
  type NewsletterDeskDto,
  type NextIssueDto,
} from '@cf/api';
import { of, Subject, throwError } from 'rxjs';
import {
  alsoCount,
  alsoRowsOf,
  BLANK_ISSUE,
  canPickAlso,
  ISSUE_AUTOSAVE_MS,
  IssueBuilder,
  issueFieldError,
  issueSavedText,
  issueSubtitle,
  preselectAlso,
  sendCardOf,
  sentIssueRowsOf,
} from './issue-builder';

const story = (
  id: string,
  includeInWeekly = false,
  section: DeskStoryDto['section'] = 'community',
): DeskStoryDto => ({
  id,
  headline: `Story ${id}`,
  section,
  publishedAt: '2026-04-15T10:45:00Z',
  includeInWeekly,
});

const ISSUE: NextIssueDto = {
  ...BLANK_ISSUE,
  number: 49,
  status: 'draft',
  // Saturday 18 April 2026, 7:00 AM in Toronto.
  sendAt: '2026-04-18T11:00:00Z',
  missedSend: false,
};

const COMPLETE: IssueFieldsDto = {
  ...BLANK_ISSUE,
  subject: 'Shame is a terrible coach',
  editorsNote: 'Morning, friends.',
  leadStoryId: 'a',
};

function deskOf(issue: NextIssueDto, stories: DeskStoryDto[] = []): NewsletterDeskDto {
  return {
    name: 'The Abundant Weekly',
    confirmedSubscribers: 6800,
    sendsAt: issue.sendAt,
    nextIssue: issue,
    stories,
    events: [],
    sent: [],
  };
}

function fake(desk: NewsletterDeskDto) {
  const saves: IssueFieldsDto[] = [];
  const scheduled: { fields: IssueFieldsDto; sendTime?: string }[] = [];
  const api: AdminNewsletterApi = {
    desk: () => of(desk),
    save: (_n, fields) => {
      saves.push(fields);
      return of({ savedAt: '2026-04-15T12:42:00Z' });
    },
    schedule: (_n, fields, sendTime) => {
      scheduled.push({ fields, sendTime });
      return of({ ...desk.nextIssue, ...fields, status: 'scheduled', missedSend: false });
    },
    unschedule: () => of({ ...desk.nextIssue, status: 'draft' }),
    sendTest: () => of({ sentTo: 'dana@christian.fitness' }),
    preview: () => throwError(() => new Error('not used')),
  };
  return { api, saves, scheduled };
}

function builderWith(api: AdminNewsletterApi): IssueBuilder {
  TestBed.configureTestingModule({
    providers: [IssueBuilder, { provide: ADMIN_NEWSLETTER_SERVICE, useValue: api }],
  });
  const builder = TestBed.inject(IssueBuilder);
  builder.open();
  return builder;
}

// L2-070 AC3: the stories marked "Include in the Weekly" are ticked, newest first, until three are.
describe('preselectAlso', () => {
  it.each<{ why: string; stories: DeskStoryDto[]; expected: string[] }>([
    { why: 'none marked', stories: [story('a'), story('b')], expected: [] },
    {
      why: 'two marked',
      stories: [story('a', true), story('b'), story('c', true)],
      expected: ['a', 'c'],
    },
    {
      why: 'four marked: the newest three',
      stories: [story('a', true), story('b', true), story('c', true), story('d', true)],
      expected: ['a', 'b', 'c'],
    },
  ])('$why', ({ stories, expected }) => {
    expect(preselectAlso(stories)).toEqual(expected);
  });
});

// L2-070 AC2: "<n> of 3", and the rest unavailable once three are ticked.
describe('Also this week', () => {
  it.each<[string[], string, boolean, string]>([
    [[], 'x', true, '0 of 3'],
    [['a', 'b'], 'x', true, '2 of 3'],
    [['a', 'b', 'c'], 'x', false, '3 of 3'],
    [['a', 'b', 'c'], 'b', true, '3 of 3'],
  ])('with %j ticked, %s can be ticked: %s (%s)', (also, id, can, count) => {
    expect(canPickAlso(also, id)).toBe(can);
    expect(alsoCount(also)).toBe(count);
  });

  it('lists every story but the big one, with its section and age, the rest unavailable at three', () => {
    const rows = alsoRowsOf(
      [
        story('lead'),
        story('a'),
        story('b', false, 'faith-and-body'),
        story('c'),
        story('d', false, null),
      ],
      { ...BLANK_ISSUE, leadStoryId: 'lead', alsoStoryIds: ['a', 'b', 'c'] },
      new Date('2026-04-15T12:45:00Z'),
    );

    expect(rows.map((r) => [r.id, r.meta, r.checked, r.disabled])).toEqual([
      ['a', 'Community · 2 hours ago', true, false],
      ['b', 'Faith & Body · 2 hours ago', true, false],
      ['c', 'Community · 2 hours ago', true, false],
      ['d', '2 hours ago', false, true],
    ]);
  });
});

// L2-070 AC1, AC4, AC6, AC8, AC10, AC14: the words around the issue, in Eastern time.
describe('the desk in words', () => {
  it('words the subtitle, the send card of each state, the save and a sent row', () => {
    expect(issueSubtitle('The Abundant Weekly', 6800)).toBe(
      'The Abundant Weekly · 6,800 subscribers · Every Saturday, 7 AM',
    );
    expect(issueSubtitle('The Abundant Weekly', 1)).toBe(
      'The Abundant Weekly · 1 subscriber · Every Saturday, 7 AM',
    );
    expect(sendCardOf(ISSUE, 6800)).toEqual({
      label: 'Goes out',
      date: 'Sat Apr 18',
      meta: '7:00 AM Eastern · 6,800 people',
    });
    expect(sendCardOf({ ...ISSUE, status: 'scheduled' }, 1)).toEqual({
      label: 'Scheduled for',
      date: 'Sat Apr 18',
      meta: '7:00 AM Eastern · 1 person',
    });
    expect(sendCardOf({ ...ISSUE, missedSend: true }, 6800).label).toBe('Was due');
    expect(issueSavedText('2026-04-15T12:42:00Z')).toBe('Saved 8:42 AM');
    expect(issueSavedText(null)).toBe('');
    expect(
      sentIssueRowsOf([
        { number: 48, sentAt: '2026-04-11T11:03:00Z', subject: 'Kettlebells', recipients: 6812 },
      ]),
    ).toEqual([
      { id: '48', number: '#48', date: 'Apr 11', subject: 'Kettlebells', recipients: '6,812' },
    ]);
  });

  it.each<[string | undefined, string | null]>([
    ['subject_required', 'Add a subject line before scheduling.'],
    ['lead_story_required', 'Choose the big story before scheduling.'],
    ['editors_note_required', "Add an editor's note before scheduling."],
    ['send_time_invalid', 'Choose a time later today.'],
    ['something_new', null],
    [undefined, null],
  ])('says what to add for %s', (code, text) => {
    expect(issueFieldError(code)).toBe(text);
  });
});

describe('IssueBuilder', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  // L2-070 AC3: only a new issue is preselected; one already written keeps its own picks.
  it('ticks the stories marked for the Weekly on a new issue, and leaves a written issue as saved', () => {
    const stories = [story('a', true), story('b'), story('c', true)];
    expect(builderWith(fake(deskOf(ISSUE, stories)).api).fields().alsoStoryIds).toEqual(['a', 'c']);
    TestBed.resetTestingModule();

    const written = builderWith(
      fake(deskOf({ ...ISSUE, subject: 'Written', alsoStoryIds: ['b'] }, stories)).api,
    );

    expect(written.fields().alsoStoryIds).toEqual(['b']);
  });

  // L2-070 AC2: a fourth story is not ticked; the big story is never also one of the others.
  it('refuses a fourth story and drops the big story from the others', () => {
    const builder = builderWith(fake(deskOf(ISSUE)).api);
    for (const id of ['a', 'b', 'c', 'd']) builder.toggleAlso(id, true);
    expect(builder.fields().alsoStoryIds).toEqual(['a', 'b', 'c']);

    builder.edit({ leadStoryId: 'b' });
    builder.toggleAlso('a', false);

    expect(builder.fields().alsoStoryIds).toEqual(['c']);
  });

  it('features and stops featuring an event', () => {
    const builder = builderWith(fake(deskOf(ISSUE)).api);

    builder.toggleEvent('e1', true);
    builder.toggleEvent('e2', true);
    builder.toggleEvent('e1', false);

    expect(builder.fields().eventIds).toEqual(['e2']);
  });

  // L2-070 AC14: a Draft is saved 2 seconds after typing stops, and shows when.
  it('saves a Draft 2 seconds after the last edit, each edit restarting the pause', () => {
    const { api, saves } = fake(deskOf(ISSUE));
    const builder = builderWith(api);

    builder.edit({ subject: 'Sha' });
    vi.advanceTimersByTime(ISSUE_AUTOSAVE_MS - 1);
    builder.edit({ subject: 'Shame' });
    vi.advanceTimersByTime(ISSUE_AUTOSAVE_MS - 1);
    expect(saves).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(saves.map((s) => s.subject)).toEqual(['Shame']);
    expect(builder.savedAt()).toBe('2026-04-15T12:42:00Z');
  });

  it('saves again after a save that an edit overtook, and keeps the fields when a save fails', () => {
    const answers = new Subject<{ savedAt: string }>();
    const { api, saves } = fake(deskOf(ISSUE));
    const builder = builderWith({
      ...api,
      save: (n, f) => (saves.push(f), answers.asObservable()),
    });

    builder.edit({ subject: 'One' });
    vi.advanceTimersByTime(ISSUE_AUTOSAVE_MS);
    builder.edit({ subject: 'Two' });
    vi.advanceTimersByTime(ISSUE_AUTOSAVE_MS);
    expect(saves.map((s) => s.subject)).toEqual(['One']);
    answers.error(new Error('offline'));

    expect(builder.saveFailed()).toBe(true);
    expect(builder.fields().subject).toBe('Two');
  });

  // L2-070 AC5: nothing is scheduled and each missing field is marked until it is edited.
  it('marks an empty subject, big story and note, sends nothing, and clears each mark on its edit', () => {
    const { api, scheduled } = fake(deskOf(ISSUE));
    const builder = builderWith(api);

    builder.schedule();

    expect(scheduled).toEqual([]);
    expect(builder.action()).toBe('invalid');
    expect(builder.fieldCodes()).toEqual({
      subject: 'subject_required',
      leadStoryId: 'lead_story_required',
      editorsNote: 'editors_note_required',
    });
    builder.edit({ subject: 'S' });
    builder.edit({ leadStoryId: 'a' });
    expect(builder.fieldCodes()).toEqual({ editorsNote: 'editors_note_required' });
    builder.edit({ editorsNote: 'N' });
    expect(builder.action()).toBe('idle');
  });

  // L2-070 AC6: a complete issue is Scheduled and locked; unscheduling makes it a Draft again.
  it('schedules a complete issue with what was typed, locks it, and unschedules it', () => {
    const { api, saves, scheduled } = fake(deskOf(ISSUE));
    const builder = builderWith(api);
    builder.edit(COMPLETE);
    let done = 0;

    builder.schedule(() => done++);

    expect(scheduled).toEqual([{ fields: COMPLETE, sendTime: undefined }]);
    expect([builder.issue()?.status, builder.locked(), done]).toEqual(['scheduled', true, 1]);
    builder.edit({ subject: 'Changed while locked' });
    vi.advanceTimersByTime(ISSUE_AUTOSAVE_MS);
    expect(builder.fields().subject).toBe(COMPLETE.subject);
    expect(saves).toEqual([]);

    builder.unschedule();

    expect([builder.issue()?.status, builder.locked()]).toEqual(['draft', false]);
  });

  it('marks the fields a refusal names, and says so when scheduling fails otherwise', () => {
    const { api } = fake(deskOf({ ...ISSUE, ...COMPLETE }));
    const refused = builderWith({
      ...api,
      schedule: () =>
        throwError(() => ({
          status: 400,
          code: 'validation_failed',
          fieldCodes: { leadStoryId: 'story_unavailable' },
        })),
    });
    refused.schedule();
    expect([refused.action(), refused.fieldCodes()]).toEqual([
      'invalid',
      { leadStoryId: 'story_unavailable' },
    ]);
    TestBed.resetTestingModule();

    const failed = builderWith({
      ...api,
      schedule: () => throwError(() => ({ status: 0, code: 'network' })),
    });
    failed.schedule();

    expect([failed.action(), failed.locked()]).toEqual(['failed', false]);
  });

  // L2-070 AC8: a missed issue needs a time later today, sent with the schedule.
  it('asks a missed issue for a time and sends it', () => {
    const { api, scheduled } = fake(deskOf({ ...ISSUE, ...COMPLETE, missedSend: true }));
    const builder = builderWith(api);

    builder.schedule();
    expect(builder.fieldCodes()).toEqual({ sendTime: 'send_time_invalid' });
    builder.chooseSendTime('11:00');
    builder.schedule();

    expect(scheduled.map((s) => s.sendTime)).toEqual(['11:00']);
    expect(builder.issue()?.missedSend).toBe(false);
  });

  // L2-070 AC9: the test names the address; an edit after it offers the test again.
  it('sends a test of the issue as it stands and names the address', () => {
    const { api } = fake(deskOf(ISSUE));
    const builder = builderWith(api);

    builder.sendTest();

    expect([builder.test(), builder.testSentTo()]).toEqual(['sent', 'dana@christian.fitness']);
    builder.edit({ subject: 'More' });
    expect(builder.test()).toBe('idle');
  });

  it('says the desk failed to load, and reads it again', () => {
    const { api } = fake(deskOf(ISSUE));
    let fail = true;
    const builder = builderWith({
      ...api,
      desk: () => (fail ? throwError(() => new Error('down')) : api.desk()),
    });
    expect(builder.load()).toBe('failed');

    fail = false;
    builder.open();

    expect([builder.load(), builder.issue()?.number]).toEqual(['ready', 49]);
  });
});
