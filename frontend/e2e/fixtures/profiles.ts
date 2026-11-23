import { SIGNED_IN } from './api-handlers';

/**
 * Profiles as `GET /api/profile/me` answers them (ADR 0015, ADR 0024), for the specs that open
 * Profile. The instants are UTC; the screen reads them in Toronto time.
 */

/** A one-pixel image, so an event's picture loads without leaving the page or the fixture. */
export const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** Grace, with every field given and two events she is going to (mock `profile/default`). */
export const FULL_PROFILE = {
  memberId: SIGNED_IN.memberId,
  name: 'Grace Thompson',
  city: 'Toronto, ON',
  // 10:30 AM in Toronto on January 14, 2026: "Member since January 2026".
  joinedAt: '2026-01-14T15:30:00Z',
  bio: 'Mom of two, recovering couch-to-5K runner. Training for my first half marathon and praying my knees agree.',
  homeChurch: 'Grace Fellowship, Scarborough',
  // Hidden from other members until she shows it (L2-006 AC4).
  showHomeChurch: false,
  goals: ['Half marathon in the fall', 'Strength twice a week', 'Sleep before 11'],
  interests: ['running', 'strength', 'basketball', 'nutrition'],
  upcomingEvents: [
    {
      eventId: '0190c0de-0000-7000-8000-00000000e001',
      title: 'Easter Sunrise 5K',
      // 6:45 AM on Saturday, April 18 in Toronto.
      startsAt: '2026-04-18T10:45:00Z',
      imageUrl: PIXEL,
    },
    {
      eventId: '0190c0de-0000-7000-8000-00000000e002',
      title: "Women's Hoops & Devotion Night",
      // 7:00 PM on Thursday, April 30 in Toronto.
      startsAt: '2026-04-30T23:00:00Z',
      imageUrl: null,
    },
  ],
};

/**
 * The instant the specs of a new profile pin the browser's clock to: 9:15 AM in Toronto on
 * November 23, 2026.
 */
export const TODAY = '2026-11-23T14:15:00Z';

/** Grace on the day she joined, with nothing given yet (mock `profile/empty`). */
export const NEW_PROFILE = {
  memberId: SIGNED_IN.memberId,
  name: 'Grace Thompson',
  city: null,
  // Half past midnight in Toronto the same day: "Member since today".
  joinedAt: '2026-11-23T05:30:00Z',
  bio: null,
  homeChurch: null,
  showHomeChurch: false,
  goals: [],
  interests: [],
  upcomingEvents: [],
};
