import type {
  AdminStoryCountsDto,
  AdminStoryListQuery,
  StorySectionName,
  StoryStatusName,
} from '@cf/api';

/** The community's time zone, in which every story time reads (ADR 0021). */
const ZONE = 'America/Toronto';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The six sections in the editor's order, with their labels (L2-001 AC1). */
export const STORY_SECTIONS: readonly { value: StorySectionName; label: string }[] = [
  { value: 'events', label: 'Events' },
  { value: 'training', label: 'Training' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'faith-and-body', label: 'Faith & Body' },
  { value: 'community', label: 'Community' },
  { value: 'pros', label: 'Pros' },
];

/** A section's label, such as "Faith & Body"; empty for none. */
export function storySectionLabel(section: StorySectionName | null): string {
  return STORY_SECTIONS.find((s) => s.value === section)?.label ?? '';
}

const STATUS_LABELS: Record<StoryStatusName, string> = {
  draft: 'Draft',
  review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
};

/** A status in words, as the badge reads it (L2-068 AC1). */
export function storyStatusLabel(status: StoryStatusName): string {
  return STATUS_LABELS[status];
}

const STATUSES: readonly StoryStatusName[] = ['draft', 'review', 'scheduled', 'published'];

/** The tab and page an address names (L2-068 AC3, AC8): an unknown status is All, a bad page the first. */
export function storyListQueryOf(params: {
  get(name: string): string | null;
}): AdminStoryListQuery {
  const status = params.get('status');
  const page = Number(params.get('page'));
  return {
    status: STATUSES.find((s) => s === status) ?? null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** The address of a tab and page; the first page and All add nothing. */
export function storyListHref(query: AdminStoryListQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return search ? `/stories?${search}` : '/stories';
}

/** One tab of Stories: its label, its address, its count (none until the list answers) and whether it shows. */
export interface StoryTabView {
  label: string;
  href: string;
  count: number | undefined;
  current: boolean;
}

const TABS: readonly {
  status: StoryStatusName | null;
  label: string;
  key: keyof AdminStoryCountsDto;
}[] = [
  { status: null, label: 'All', key: 'all' },
  { status: 'draft', label: 'Draft', key: 'draft' },
  { status: 'review', label: 'In review', key: 'review' },
  { status: 'scheduled', label: 'Scheduled', key: 'scheduled' },
  { status: 'published', label: 'Published', key: 'published' },
];

/** All, Draft, In review, Scheduled and Published with their addresses and counts (L2-068 AC3). */
export function storyTabs(
  query: AdminStoryListQuery,
  counts: AdminStoryCountsDto | null,
): StoryTabView[] {
  return TABS.map(({ status, label, key }) => ({
    label,
    href: storyListHref({ status, page: 1 }),
    count: counts ? counts[key] : undefined,
    current: status === query.status,
  }));
}

let dayKey: Intl.DateTimeFormat | undefined;
let clock: Intl.DateTimeFormat | undefined;
let shortDay: Intl.DateTimeFormat | undefined;
let weekdayDay: Intl.DateTimeFormat | undefined;

/** The Toronto calendar day of an instant, as a number of days, to compare days across zones. */
function torontoDay(instant: Date): number {
  dayKey ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return Date.parse(`${dayKey.format(instant)}T00:00:00Z`) / (24 * HOUR);
}

function clockOf(instant: Date): string {
  clock ??= new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  // ICU puts a narrow no-break space before AM and PM; the mocks have a plain space.
  return clock.format(instant).replace(/\s/g, ' ');
}

function yearOf(instant: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric' }).format(instant);
}

/** "Apr 8", or "Apr 8, 2025" in another year than `now`'s. */
function dateOf(instant: Date, now: Date): string {
  shortDay ??= new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric' });
  const day = shortDay.format(instant);
  return yearOf(instant) === yearOf(now) ? day : `${day}, ${yearOf(instant)}`;
}

/** "just now", "5 min ago", "1 hour ago" the same day, "yesterday", else "on Apr 8". */
function ago(instant: Date, now: Date): string {
  const since = now.getTime() - instant.getTime();
  const days = torontoDay(now) - torontoDay(instant);
  if (since < MINUTE) return 'just now';
  if (since < HOUR) return `${Math.floor(since / MINUTE)} min ago`;
  if (days === 0) {
    const hours = Math.floor(since / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'yesterday';
  return `on ${dateOf(instant, now)}`;
}

/**
 * A row's "when" (L2-068 AC1; mock `admin-stories/default`), in Toronto: a Draft "Edited
 * yesterday", a story In review "Submitted 1 hour ago", a Scheduled one "Sat Apr 18, 6:00 AM", a
 * Published one "Today, 7:12 AM", "Yesterday" or "Apr 8". Empty for a value that is not an instant.
 */
export function storyWhen(status: StoryStatusName, when: string, now: Date): string {
  const instant = new Date(when);
  if (Number.isNaN(instant.getTime())) return '';
  switch (status) {
    case 'draft':
      return `Edited ${ago(instant, now)}`;
    case 'review':
      return `Submitted ${ago(instant, now)}`;
    case 'scheduled':
      weekdayDay ??= new Intl.DateTimeFormat('en-US', {
        timeZone: ZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `${weekdayDay.format(instant).replace(',', '')}, ${clockOf(instant)}`;
    case 'published': {
      const days = torontoDay(now) - torontoDay(instant);
      if (days === 0) return `Today, ${clockOf(instant)}`;
      if (days === 1) return 'Yesterday';
      return dateOf(instant, now);
    }
  }
}

/**
 * What the editor's bar says of the last save (L2-069 AC1, AC11; mocks `admin-story-editor/*`):
 * "Saved 2 min ago" or "Saved yesterday", "Published today, 7:12 AM" for a Published story, and
 * "Not saved yet" for a story never saved. Empty for a value that is not an instant.
 */
export function storySavedText(
  status: StoryStatusName,
  savedAt: string | null,
  publishedAt: string | null,
  now: Date,
): string {
  if (status === 'published' && publishedAt) {
    const when = storyWhen('published', publishedAt, now);
    return when ? `Published ${when.charAt(0).toLowerCase()}${when.slice(1)}` : '';
  }
  if (!savedAt) return 'Not saved yet';
  const instant = new Date(savedAt);
  return Number.isNaN(instant.getTime()) ? '' : `Saved ${ago(instant, now)}`;
}

/** A review call-out's label (L2-068 AC2): "Waiting for your review · Submitted 1 hour ago". */
export function storyReviewLabel(submittedAt: string, now: Date): string {
  return `Waiting for your review · ${storyWhen('review', submittedAt, now)}`;
}

/** A story's byline and section on one line, "Priya Raman · Nutrition", leaving out what is not chosen. */
export function storyByline(byline: string | null, section: StorySectionName | null): string {
  return [byline, storySectionLabel(section)].filter((part) => part).join(' · ');
}

let countFormat: Intl.NumberFormat | undefined;

/** A published story's reads, "3,412"; none for a story never published, which shows a dash (L2-068 AC1). */
export function storyReadsText(reads: number | null): string | null {
  if (reads === null) return null;
  countFormat ??= new Intl.NumberFormat('en-US');
  return countFormat.format(reads);
}

/** How many words a reader reads a minute, for "6 min read". */
const WORDS_A_MINUTE = 220;

/**
 * A story's reading time in minutes (L2-061 AC2; ADR 0105): its words, the white-space separated
 * runs holding a letter or digit (so Markdown marks are not words), at 220 a minute, rounded up,
 * never less than 1. The one place the rule lives; the page and the admin preview both use it.
 */
export function storyReadingMinutes(text: string): number {
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / WORDS_A_MINUTE));
}

/**
 * The story page's byline line (mocks `story/default`, `admin-story-preview/default`): "2 hours
 * ago · 6 min read", "Yesterday · 1 min read" or "Apr 8 · …", and "Not published yet · …" before
 * it goes out.
 */
export function storyReaderWhen(publishedAt: string | null, text: string, now: Date): string {
  const read = `${storyReadingMinutes(text)} min read`;
  const instant = publishedAt ? new Date(publishedAt) : null;
  if (!instant || Number.isNaN(instant.getTime())) return `Not published yet · ${read}`;
  const when = ago(instant, now).replace(/^on /, '');
  return `${when.charAt(0).toUpperCase()}${when.slice(1)} · ${read}`;
}

/**
 * The preview's bar (L2-069 AC13; mocks `admin-story-preview/*`): its bold lead names the status,
 * or "loading" and "not loaded" before there is one; the rest says who can see it.
 */
export function storyPreviewNotice(state: StoryStatusName | 'loading' | 'failed'): {
  lead: string;
  text: string;
} {
  const named =
    state === 'loading' ? 'loading' : state === 'failed' ? 'not loaded' : storyStatusLabel(state);
  return {
    lead: `Preview · ${named}.`,
    text: 'Only Admins can see this page. Readers see the story once it is published.',
  };
}

/** The next step card's label (L2-061 AC4): "From this story" for an event, "In the directory" for a listing. */
export function storyNextLabel(kind: 'event' | 'listing'): string {
  return kind === 'event' ? 'From this story' : 'In the directory';
}
