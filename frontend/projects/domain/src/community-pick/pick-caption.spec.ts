import type { PickableEventDto } from '@cf/api';
import { pickCaptionOf, pickPriceOf, pickSlackPostOf, pickWhenOf } from './pick-caption';

const ORIGIN = 'https://www.christian.fitness';
const NOTE = 'Flat, stroller-friendly, and you finish as the sun comes up.';

// The mocks' event: Sat Apr 18 at 6:45 AM in Toronto (10:45 UTC), free, 58 places left.
const SUNRISE: PickableEventDto = {
  id: '018f0000-0000-7000-8000-000000000001',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00+00:00',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront, Toronto',
  priceCents: 0,
  spotsLeft: 58,
  imageKey: null,
  lastPickedAt: null,
};
const LINK = `${ORIGIN}/e/${SUNRISE.id}`;

// L2-072 AC6: each caption holds the title, the note, day, date and time, the place, the price and
// the link, in the platform's own form; the expected texts are the mocks' captions.
describe('pickCaptionOf', () => {
  it('writes Instagram with "Link in bio", the short address as text and hashtags', () => {
    expect(pickCaptionOf('instagram', SUNRISE, NOTE, ORIGIN)).toBe(
      [
        'Community Pick: Easter Sunrise 5K',
        '',
        NOTE,
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        `Free. Link in bio, or register at www.christian.fitness/e/${SUNRISE.id}`,
        '',
        '#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness',
      ].join('\n'),
    );
  });

  it('writes Facebook with the spots left and the link', () => {
    expect(pickCaptionOf('facebook', SUNRISE, NOTE, ORIGIN)).toBe(
      [
        'This week’s Community Pick: Easter Sunrise 5K.',
        '',
        NOTE,
        '',
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
        'Free, 58 spots left.',
        '',
        `Register: ${LINK}`,
      ].join('\n'),
    );
  });

  it('writes WhatsApp with *bold* and _italic_', () => {
    expect(pickCaptionOf('whatsapp', SUNRISE, NOTE, ORIGIN)).toBe(
      [
        '*Community Pick: Easter Sunrise 5K*',
        `_${NOTE}_`,
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        'Free',
        '',
        `Register: ${LINK}`,
      ].join('\n'),
    );
  });

  it('writes Slack with a titled link and the price', () => {
    expect(pickCaptionOf('slack', SUNRISE, NOTE, ORIGIN)).toBe(
      [
        `*Community Pick:* <${LINK}|Easter Sunrise 5K>`,
        NOTE,
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      ].join('\n'),
    );
  });

  it.each([
    {
      platform: 'instagram' as const,
      expected: [
        'Community Pick: Easter Sunrise 5K',
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        `Free. Link in bio, or register at www.christian.fitness/e/${SUNRISE.id}`,
        '',
        '#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness',
      ],
    },
    {
      platform: 'facebook' as const,
      expected: [
        'This week’s Community Pick: Easter Sunrise 5K.',
        '',
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
        'Free, 58 spots left.',
        '',
        `Register: ${LINK}`,
      ],
    },
    {
      platform: 'whatsapp' as const,
      expected: [
        '*Community Pick: Easter Sunrise 5K*',
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        'Free',
        '',
        `Register: ${LINK}`,
      ],
    },
    {
      platform: 'slack' as const,
      expected: [
        `*Community Pick:* <${LINK}|Easter Sunrise 5K>`,
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      ],
    },
  ])('leaves the note out of $platform when there is none', ({ platform, expected }) => {
    expect(pickCaptionOf(platform, SUNRISE, '   ', ORIGIN)).toBe(expected.join('\n'));
  });

  it('escapes Slack control characters in the title, so the link stays one link', () => {
    const event = { ...SUNRISE, title: 'Hoops <Night> & Devotion | Prayer' };
    expect(pickCaptionOf('slack', event, '', ORIGIN).split('\n')[0]).toBe(
      `*Community Pick:* <${LINK}|Hoops &lt;Night&gt; &amp; Devotion ¦ Prayer>`,
    );
  });

  it('counts one spot left in the singular on Facebook', () => {
    const event = { ...SUNRISE, priceCents: 1500, spotsLeft: 1 };
    expect(pickCaptionOf('facebook', event, '', ORIGIN).split('\n')[3]).toBe('$15, 1 spot left.');
  });
});

describe('pickPriceOf', () => {
  it.each([
    { cents: 0, expected: 'Free' },
    { cents: 1500, expected: '$15' },
    { cents: 1250, expected: '$12.50' },
    { cents: 5, expected: '$0.05' },
  ])('says $cents cents as $expected', ({ cents, expected }) => {
    expect(pickPriceOf(cents)).toBe(expected);
  });
});

describe('pickWhenOf', () => {
  it.each([
    { startsAt: '2026-04-18T10:45:00+00:00', expected: 'Sat, Apr 18 at 6:45 AM' },
    { startsAt: '2026-05-06T13:30:00+00:00', expected: 'Wed, May 6 at 9:30 AM' },
    { startsAt: '2026-04-30T23:00:00+00:00', expected: 'Thu, Apr 30 at 7:00 PM' },
  ])('says $startsAt in Toronto as $expected', ({ startsAt, expected }) => {
    expect(pickWhenOf(startsAt)).toBe(expected);
  });
});

// Slack mock: the post as a channel shows it.
describe('pickSlackPostOf', () => {
  it('gives the title, the note, the details line and the site as Slack shows them', () => {
    expect(pickSlackPostOf(SUNRISE, NOTE, ORIGIN)).toEqual({
      title: 'Easter Sunrise 5K',
      note: NOTE,
      details: 'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      site: 'www.christian.fitness',
    });
  });
});
