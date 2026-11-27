import { storyImageUrl, type IssueDto, type IssueStoryDto, type StorySectionName } from '@cf/api';
import { pickPriceOf } from '../community-pick/pick-caption';
import { pickAreaOf, torontoPartsOf } from '../community-pick/pick-view';
import { EVENT_TIME_ZONE } from '../events/event-when';
import { storySectionLabel } from '../news/story-list';

/** An issue in words, as the components library's issue view draws it. */
export interface IssueWords {
  name: string;
  date: string;
  greeting: string | null;
  editorsNote: string;
  lead: {
    section: string;
    title: string;
    summary: string;
    image: string | null;
    href: string;
  } | null;
  events: { id: string; month: string; day: string; title: string; meta: string }[];
  briefs: {
    href: string;
    section: string;
    title: string;
    summary: null;
    author: string;
    age: string;
    image: string | null;
  }[];
  verse: string;
  verseReference: string;
}

// Made once on first use, not at import: a formatter is costly to create.
let longDate: Intl.DateTimeFormat | undefined;

/**
 * The greeting of the web version (L2-059 AC2): "Morning, Grace." with the first word of a
 * signed-in member's name; none for a visitor or a member with no name.
 */
export function issueGreeting(sessionName: string | null): string | null {
  const first = sessionName?.trim().split(/\s+/)[0];
  return first ? `Morning, ${first}.` : null;
}

/** The bar above the web version (L2-059 AC2): "Issue 48 · web version"; "Web version" until the number is known. */
export function issueBarText(number: number | null): string {
  return number === null ? 'Web version' : `Issue ${number} · web version`;
}

/** The issue a `/newsletter/<number>` address names: a whole number above 0, else none. */
export function issueNumberOf(param: string | null): number | null {
  return param !== null && /^[1-9]\d{0,8}$/.test(param) ? Number(param) : null;
}

const sectionOf = (story: IssueStoryDto) =>
  storySectionLabel(story.section as StorySectionName | null);

/** An issue in words (L2-059 AC1): dates and times in Toronto, prices as "Free" or "$10". */
export function issueWordsOf(issue: IssueDto, sessionName: string | null): IssueWords {
  longDate ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    name: issue.name,
    date: `No. ${issue.number} · ${longDate.format(new Date(issue.date))}`,
    greeting: issueGreeting(sessionName),
    editorsNote: issue.editorsNote,
    lead: issue.lead && {
      section: ['The big story', sectionOf(issue.lead)].filter((part) => part).join(' · '),
      title: issue.lead.headline,
      summary: issue.lead.summary,
      image: issue.lead.image ? storyImageUrl(issue.lead.image.key) : null,
      href: `/stories/${encodeURIComponent(issue.lead.slug)}`,
    },
    events: issue.events.map((event) => {
      const at = torontoPartsOf(event.startsAt);
      return {
        id: event.id,
        month: at.month,
        day: at.day,
        title: event.title,
        meta: `${at.weekday} ${at.time} · ${pickAreaOf(event.area)} · ${pickPriceOf(event.priceCents)}`,
      };
    }),
    briefs: issue.briefs.map((story) => ({
      href: `/stories/${encodeURIComponent(story.slug)}`,
      section: sectionOf(story),
      title: story.headline,
      summary: null,
      author: story.author ?? '',
      age: '',
      image: story.image ? storyImageUrl(story.image.key) : null,
    })),
    verse: issue.verse,
    verseReference: issue.verseReference,
  };
}
