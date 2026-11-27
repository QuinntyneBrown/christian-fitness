import type { ApiReply } from './api-handlers';

/** Issue 48 of mock `newsletter/default`, sent Saturday 11 April 2026 at 7:00 AM in Toronto. */
export const ISSUE_48 = {
  number: 48,
  date: '2026-04-11T11:00:00+00:00',
  name: 'The Abundant Weekly',
  editorsNote:
    'Spring finally showed up, and so did you: 142 of you have signed up for the Easter Sunrise 5K, our biggest start line yet.',
  lead: {
    slug: 'basement-gym',
    section: 'community',
    headline:
      'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
    summary:
      'Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.',
    author: 'Naomi Clarke',
    image: null,
  },
  briefs: [
    {
      slug: 'meal-prep-ministry',
      section: 'nutrition',
      headline:
        'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
      summary: '',
      author: 'Priya Raman',
      image: null,
    },
    {
      slug: 'sabbath-rest',
      section: 'faith-and-body',
      headline: 'Why your rest day might be the most spiritual part of your training plan',
      summary: '',
      author: 'Pastor Ruth Adeyemi',
      image: null,
    },
  ],
  events: [
    {
      id: 'e-5k',
      title: 'Easter Sunrise 5K',
      startsAt: '2026-04-18T10:45:00+00:00',
      area: 'Waterfront, Toronto',
      priceCents: 0,
    },
    {
      id: 'e-bootcamp',
      title: 'Saturday Park Bootcamp',
      startsAt: '2026-04-25T12:00:00+00:00',
      area: 'Waterfront, Toronto',
      priceCents: 1000,
    },
  ],
  verse: 'Do you not know that your bodies are temples of the Holy Spirit?',
  verseReference: '1 Corinthians 6:19',
};

/** The answer for an issue that is not on the web: 404 `not_found` (L2-059 AC4). */
export const ISSUE_NOT_FOUND: ApiReply = { status: 404, json: { code: 'not_found' } };
