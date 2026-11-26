import type { PickableEventDto } from '@cf/api';
import type { PickPlatform } from './pick-assets';
import { torontoPartsOf } from './pick-view';

/** What a Slack channel shows of the post (mock `admin-community-pick/slack`, `slack-preview`). */
export interface PickSlackPost {
  title: string;
  note: string;
  /** "Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free". */
  details: string;
  /** The site the unfurl names: "www.christian.fitness". */
  site: string;
}

/** The formatting hint under each caption, if its platform has one (mocks `whatsapp`, `slack`). */
export const PICK_CAPTION_HINTS: Readonly<Record<PickPlatform, string | null>> = {
  instagram: null,
  facebook: null,
  whatsapp: 'Asterisks and underscores format as bold and italic in WhatsApp.',
  slack: 'Slack formatting: the title becomes a link.',
};

/** "Free", "$15" or "$12.50": an event's price as every caption says it (L2-072 AC6). */
export function pickPriceOf(cents: number): string {
  if (cents <= 0) return 'Free';
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "Sat, Apr 18 at 6:45 AM": when an event starts, in Toronto, as the captions say it. */
export function pickWhenOf(startsAt: string): string {
  const { weekday, month, day, time } = torontoPartsOf(startsAt);
  return `${weekday}, ${month} ${Number(day)} at ${time}`;
}

/** The event's link, `<origin>/e/<id>` (ADR 0071, ADR 0098). */
function linkOf(event: PickableEventDto, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/e/${event.id}`;
}

/** Slack's control characters escaped, and `|` (which would end the link's title) as `¦`. */
function slackText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '¦');
}

/** "Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free". */
function slackDetailsOf(event: PickableEventDto): string {
  return `${pickWhenOf(event.startsAt)} · ${event.place} · ${pickPriceOf(event.priceCents)}`;
}

/**
 * The caption of a pick for `platform` (L2-072 AC6; ADR 0098), as the mocks write it: the title,
 * the note (left out when blank), when, the place, the price and the link, in the platform's own
 * form. Instagram says "Link in bio" and gives the address in text, without its scheme; Facebook
 * gives the spots left; WhatsApp sets `*bold*` and `_italic_`; Slack makes the title a link.
 */
export function pickCaptionOf(
  platform: PickPlatform,
  event: PickableEventDto,
  note: string,
  origin: string,
): string {
  const why = note.trim();
  const when = pickWhenOf(event.startsAt);
  const price = pickPriceOf(event.priceCents);
  const link = linkOf(event, origin);
  const lines = (...parts: (string | null)[]): string =>
    parts.filter((part): part is string => part !== null).join('\n');
  switch (platform) {
    case 'instagram':
      return lines(
        `Community Pick: ${event.title}`,
        '',
        ...(why ? [why, ''] : []),
        when,
        event.place,
        `${price}. Link in bio, or register at ${link.replace(/^https?:\/\//, '')}`,
        '',
        '#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness',
      );
    case 'facebook': {
      const spots = `${event.spotsLeft} ${event.spotsLeft === 1 ? 'spot' : 'spots'} left`;
      return lines(
        `This week’s Community Pick: ${event.title}.`,
        '',
        ...(why ? [why, ''] : []),
        `${when} · ${event.place}`,
        `${price}, ${spots}.`,
        '',
        `Register: ${link}`,
      );
    }
    case 'whatsapp':
      return lines(
        `*Community Pick: ${event.title}*`,
        why ? `_${why}_` : null,
        '',
        when,
        event.place,
        price,
        '',
        `Register: ${link}`,
      );
    case 'slack':
      return lines(
        `*Community Pick:* <${link}|${slackText(event.title)}>`,
        why ? slackText(why) : null,
        slackText(slackDetailsOf(event)),
      );
  }
}

/** The post as a Slack channel shows it, for the preview (L2-072 AC4). */
export function pickSlackPostOf(
  event: PickableEventDto,
  note: string,
  origin: string,
): PickSlackPost {
  return {
    title: event.title,
    note: note.trim(),
    details: slackDetailsOf(event),
    site: new URL(origin).host,
  };
}
