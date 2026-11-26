import type { SaidItem } from '@cf/components';

/**
 * "You said, we did": recent changes that began as member feedback, written by Admins as static
 * content in the app for now; later a story section (L2-063 AC3; ADR 0109; mock
 * `feedback/default`).
 */
export const YOU_SAID_WE_DID: readonly SaidItem[] = [
  {
    quote: 'I never know if an event got moved.',
    did: 'Change alerts for every event you’re going to',
    when: 'March 2026',
  },
  {
    quote: 'Can I join a whole series instead of every date?',
    did: 'Join a series in one tap',
    when: 'February 2026',
  },
  {
    quote: 'The newsletter is too long on my phone.',
    did: 'A shorter Weekly with one big story',
    when: 'January 2026',
  },
];
