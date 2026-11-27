import type { ApiHandlers, ApiReply } from './api-handlers';

/** The mocks' "now": Wednesday 15 April 2026, 8:45 AM in Toronto. */
export const FEEDBACK_NOW = new Date('2026-04-15T12:45:00Z');

export interface FeedbackNoteFixture {
  id: string;
  kind: 'idea' | 'problem' | 'correction' | 'thanks';
  status: 'new' | 'replied' | 'resolved';
  sentAt: string;
  text: string;
  sender: { name: string; email: string; suspended: boolean };
  page: { routeTemplate: string | null; title: string | null };
  storyId: string | null;
  device: string;
  browser: string;
  hasScreenshot: boolean;
  mayEmail: boolean;
  replies: { text: string; sentAt: string; by: string }[];
}

/** Michael's problem, New, 35 minutes ago (mock `admin-feedback/default`). */
export const CALENDAR_BUG: FeedbackNoteFixture = {
  id: '0193f000-0000-7000-8000-000000000001',
  kind: 'problem',
  status: 'new',
  sentAt: '2026-04-15T12:10:00+00:00',
  text: 'The “Add to calendar” button opens a blank page on my phone. Worked fine on my laptop. I tried twice.',
  sender: { name: 'Michael Chen', email: 'mchen.runs@outlook.com', suspended: false },
  page: { routeTemplate: 'events/:id', title: 'Easter Sunrise 5K' },
  storyId: null,
  device: 'iOS',
  browser: 'Safari 18',
  hasScreenshot: false,
  mayEmail: true,
  replies: [],
};

/** Adaeze's correction about a story, New, 2 hours ago (mock `correction`). */
export const STORY_CORRECTION: FeedbackNoteFixture = {
  id: '0193f000-0000-7000-8000-000000000002',
  kind: 'correction',
  status: 'new',
  sentAt: '2026-04-15T10:45:00+00:00',
  text: 'Small correction: RCCG Jesus House is one of the twelve churches but isn’t in the list in the story.',
  sender: { name: 'Adaeze Kalu', email: 'adaeze.k@yahoo.ca', suspended: false },
  page: { routeTemplate: 'stories/:slug', title: 'Twelve GTA churches will run the Toronto Half' },
  storyId: '0193b000-0000-7000-8000-000000005701',
  device: 'Android',
  browser: 'Chrome 124',
  hasScreenshot: true,
  mayEmail: false,
  replies: [],
};

/** Grace's idea, Replied yesterday. */
export const SERIES_IDEA: FeedbackNoteFixture = {
  id: '0193f000-0000-7000-8000-000000000003',
  kind: 'idea',
  status: 'replied',
  sentAt: '2026-04-14T14:00:00+00:00',
  text: 'Could the series page show which week of the plan each session is?',
  sender: { name: 'Grace Thompson', email: 'grace@example.org', suspended: false },
  page: { routeTemplate: 'events/series/:id', title: 'Couch to 5K Run Club' },
  storyId: null,
  device: 'macOS',
  browser: 'Chrome 126',
  hasScreenshot: false,
  mayEmail: true,
  replies: [
    {
      text: 'Good idea, Grace. It is on the list for May.',
      sentAt: '2026-04-14T15:00:00+00:00',
      by: 'Dana Whitfield',
    },
  ],
};

/** Priya's thanks, Resolved two days ago (mock `resolved`). */
export const VERSE_THANKS: FeedbackNoteFixture = {
  id: '0193f000-0000-7000-8000-000000000004',
  kind: 'thanks',
  status: 'resolved',
  sentAt: '2026-04-13T12:00:00+00:00',
  text: 'The verse at the end of the newsletter has become my Saturday long-run mantra. Thank you for that.',
  sender: { name: 'Priya Nair', email: 'priya.nair@gmail.com', suspended: false },
  page: { routeTemplate: 'newsletter', title: null },
  storyId: null,
  device: 'iOS',
  browser: 'Safari 18',
  hasScreenshot: false,
  mayEmail: true,
  replies: [],
};

/** The four notes of the mocks, newest first. */
export const NOTES = [CALENDAR_BUG, STORY_CORRECTION, SERIES_IDEA, VERSE_THANKS];

const rowOf = (note: FeedbackNoteFixture) => ({
  id: note.id,
  kind: note.kind,
  sender: note.sender.name,
  sentAt: note.sentAt,
  excerpt: note.text.slice(0, 120),
  status: note.status,
});

/** What the inbox sent. */
export interface InboxCalls {
  lists: (string | null)[];
  replies: { id: string; text: string }[];
  resolved: string[];
  reopened: string[];
}

/**
 * Answers the inbox for `notes` as the API would: the list by status with every tab's count, each
 * note, a reply (kept, the note Replied, by email when the member allowed it), resolve and reopen.
 * Returns what was sent.
 */
export function answerInbox(api: ApiHandlers, notes: FeedbackNoteFixture[] = NOTES): InboxCalls {
  const calls: InboxCalls = { lists: [], replies: [], resolved: [], reopened: [] };
  const store = new Map(notes.map((note) => [note.id, structuredClone(note)]));
  const all = () => [...store.values()];
  const idOf = (url: string) => new URL(url).pathname.split('/')[4];
  const missing: ApiReply = { status: 404, json: { code: 'not_found' } };
  api.on('GET', '/api/admin/feedback', (request) => {
    const status = new URL(request.url()).searchParams.get('status');
    calls.lists.push(status);
    const count = (of: string) => all().filter((note) => note.status === of).length;
    return {
      json: {
        counts: {
          all: store.size,
          new: count('new'),
          replied: count('replied'),
          resolved: count('resolved'),
        },
        items: all()
          .filter((note) => !status || note.status === status)
          .map(rowOf),
      },
    };
  });
  api.on('GET', /^\/api\/admin\/feedback\/[0-9a-f-]{36}$/, (request) => {
    const note = store.get(idOf(request.url()));
    return note ? { json: note } : missing;
  });
  api.on('POST', /^\/api\/admin\/feedback\/[0-9a-f-]{36}\/replies$/, (request) => {
    const note = store.get(idOf(request.url()));
    if (!note) return missing;
    const { text } = request.postDataJSON() as { text: string };
    calls.replies.push({ id: note.id, text });
    const reply = { text: text.trim(), sentAt: '2026-04-15T12:45:00+00:00', by: 'Dana Whitfield' };
    note.replies.push(reply);
    note.status = 'replied';
    return {
      status: 201,
      json: { status: 'replied', deliveredBy: note.mayEmail ? 'email' : 'message', reply },
    };
  });
  api.on('POST', /^\/api\/admin\/feedback\/[0-9a-f-]{36}\/resolve$/, (request) => {
    const note = store.get(idOf(request.url()))!;
    calls.resolved.push(note.id);
    note.status = 'resolved';
    return { json: { status: 'resolved' } };
  });
  api.on('POST', /^\/api\/admin\/feedback\/[0-9a-f-]{36}\/reopen$/, (request) => {
    const note = store.get(idOf(request.url()))!;
    calls.reopened.push(note.id);
    note.status = 'new';
    return { json: { status: 'new' } };
  });
  return calls;
}

/** A 1 × 1 PNG for `GET /api/admin/feedback/<id>/screenshot`. */
export const SCREENSHOT = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
  'base64',
);
