import type { PickableEventDto } from '@cf/api';
import { eventImageSrc } from '../events/event-card-view';
import { EVENT_TIME_ZONE } from '../events/event-when';

/** The longest note: it goes on every graphic and caption (L2-072 AC2; ADR 0098). */
export const PICK_NOTE_MAX = 70;

/** One event as its choice reads: the photo, "Sat Apr 18", the title and the area line. */
export interface PickChoiceView {
  id: string;
  imageSrc: string;
  when: string;
  title: string;
  /** The area, then " · Last picked Apr 6" when it has been picked (L2-072 AC13). */
  area: string;
}

/** What a Community Pick graphic says, and how it is named for assistive technology. */
export interface PickArtText {
  /** "Community Pick graphic: Easter Sunrise 5K, Sat Apr 18". */
  label: string;
  title: string;
  /** "Sat Apr 18 · 6:45 AM · Waterfront". */
  when: string;
  note: string;
}

interface TorontoParts {
  weekday: string;
  month: string;
  day: string;
  time: string;
}

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/** An instant's weekday, month, two-digit day and time in Toronto, whatever the browser's zone. */
export function torontoPartsOf(instant: string): TorontoParts {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  return {
    weekday: at['weekday'] ?? '',
    month: at['month'] ?? '',
    day: at['day'] ?? '',
    time: `${at['hour']}:${at['minute']} ${at['dayPeriod']}`,
  };
}

/** The neighbourhood of an area, up to its first comma: "Waterfront" for "Waterfront, Toronto" (ADR 0098). */
export function pickAreaOf(area: string): string {
  return area.split(',')[0].trim();
}

/** "Sat Apr 18": the date an event choice and a graphic's label show. */
function shortDateOf(startsAt: string): string {
  const { weekday, month, day } = torontoPartsOf(startsAt);
  return `${weekday} ${month} ${day}`;
}

/** An event as its choice reads (mock `admin-community-pick/pick`). */
export function pickChoiceOf(event: PickableEventDto): PickChoiceView {
  const area = pickAreaOf(event.area);
  let picked = '';
  if (event.lastPickedAt) {
    const { month, day } = torontoPartsOf(event.lastPickedAt);
    picked = ` · Last picked ${month} ${Number(day)}`;
  }
  return {
    id: event.id,
    imageSrc: eventImageSrc(event),
    when: shortDateOf(event.startsAt),
    title: event.title,
    area: `${area}${picked}`,
  };
}

/** What the graphic of `event` with `note` says (L2-072 AC5). */
export function pickArtTextOf(event: PickableEventDto, note: string): PickArtText {
  const date = shortDateOf(event.startsAt);
  return {
    label: `Community Pick graphic: ${event.title}, ${date}`,
    title: event.title,
    when: `${date} · ${torontoPartsOf(event.startsAt).time} · ${pickAreaOf(event.area)}`,
    note: note.trim(),
  };
}

/** The note's hint: "One line. It goes on the graphics and in every caption. 60 of 70 characters." */
export function pickNoteHintOf(note: string): string {
  return `One line. It goes on the graphics and in every caption. ${note.length} of ${PICK_NOTE_MAX} characters.`;
}
