import type { ClaimPreviewDto } from '@cf/api';
import { claimExpiryText, claimHintOf, claimOutcomeOf, claimPreviewViewOf } from './listing-claim';

const EASTSIDE: ClaimPreviewDto = {
  kind: 'organization',
  name: 'Eastside Ladies Who Lift',
  tagline: '',
  area: 'East York',
  about: '',
  focus: [],
  website: 'https://www.eastsideladies.ca/',
  isVerified: false,
  photoKey: null,
};

// L2-078 AC8, AC9 (ADR 0092): each refusal's code names its outcome; anything else is a failure.
describe('claimOutcomeOf', () => {
  it.each([
    { error: { status: 409, code: 'claim_link_used' }, outcome: 'claimed' },
    { error: { status: 410, code: 'claim_link_expired' }, outcome: 'expired' },
    { error: { status: 404, code: 'claim_not_found' }, outcome: 'not-found' },
    { error: { status: 404, code: 'not_found' }, outcome: 'failed' },
    { error: { status: 500, code: 'error' }, outcome: 'failed' },
    { error: { status: 0, code: 'network' }, outcome: 'failed' },
    { error: 'not an api error', outcome: 'failed' },
  ])('$error.code is $outcome', ({ error, outcome }) => {
    expect(claimOutcomeOf(error)).toBe(outcome);
  });
});

// ADR 0092: the expiry is the day in Toronto, which is a day earlier than UTC late in the evening.
describe('claimExpiryText', () => {
  it.each([
    { expiresAt: '2026-12-09T17:00:00Z', text: 'December 9' },
    { expiresAt: '2026-12-10T04:59:59Z', text: 'December 9' },
    { expiresAt: '2026-12-10T05:00:00Z', text: 'December 10' },
  ])('$expiresAt is $text', ({ expiresAt, text }) => {
    expect(claimExpiryText(expiresAt)).toBe(text);
  });

  it('the hint names the member and the day', () => {
    expect(claimHintOf('Grace Thompson', '2026-12-09T17:00:00Z')).toBe(
      'Signed in as Grace Thompson. Publishing makes you the owner, so you can edit it later. This link works once and expires on December 9.',
    );
  });
});

// L2-078 AC5: the preview shows what the listing has; a draft from a suggestion may lack much.
describe('claimPreviewViewOf', () => {
  it('names the kind, the initials and the facts it has, the website as its host', () => {
    expect(claimPreviewViewOf(EASTSIDE)).toEqual({
      kind: 'Organization',
      person: false,
      initials: 'EL',
      photoSrc: null,
      facts: [
        { term: 'Area', detail: 'East York', icon: 'pin' },
        { term: 'Website', detail: 'eastsideladies.ca', icon: 'globe' },
      ],
    });
  });

  it('leaves out a website that is not https and an empty area', () => {
    expect(
      claimPreviewViewOf({ ...EASTSIDE, area: ' ', website: 'http://eastsideladies.ca' }).facts,
    ).toEqual([]);
  });

  it('shows a person round, and a photo from the directory', () => {
    const view = claimPreviewViewOf({
      ...EASTSIDE,
      kind: 'instructor',
      name: 'Coach Marcus Delaney',
      photoKey: 'a b',
    });
    expect([view.kind, view.person, view.photoSrc]).toEqual([
      'Instructor',
      true,
      '/api/directory/photos/a%20b',
    ]);
  });
});
