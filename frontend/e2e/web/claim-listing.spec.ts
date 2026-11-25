import { expect, SIGNED_IN, test } from '../fixtures/test';
import {
  answerAsVisitor,
  CLAIM_PATH,
  CLAIM_SIGNED_IN,
  CLAIM_SIGNED_OUT,
  CLAIM_TOKEN,
} from '../fixtures/claims';
import { WebClaimListingPage } from '../page-objects/web/claim-listing.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const RETURN = `returnUrl=${encodeURIComponent(`/claim/${CLAIM_TOKEN}`)}`;

// L2-078 AC4 (ADR 0091; mock `claim-listing/signed-out`): a visitor who opens a valid link sees the
// listing's name and Sign in and Join, both returning to the link, and nothing else of the listing.
test.describe('Member app, claim a listing: signed out', () => {
  test('names the listing and offers Sign in and Join, both returning to the link', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_OUT }));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.cardHeading).toHaveText('Claim Eastside Ladies Who Lift');
    await expect(page).toHaveTitle('Claim a listing · Christian Fitness');
    await expect(claim.cardLead).toHaveText(
      'Sign in or join first, so the listing is yours and you can edit it later. We bring you straight back here.',
    );
    await expect(claim.signInLink).toHaveAttribute('href', `/sign-in?${RETURN}`);
    await expect(claim.joinLink).toHaveAttribute('href', `/join?${RETURN}`);
    await expect(claim.cardNote).toHaveText('This link works once and expires on December 9.');
    await expect(claim.preview).toHaveCount(0);
    await expect(claim.main).not.toContainText('Saturday morning');
  });

  test('Join brings the new member straight back to the link', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_OUT }));
    const claim = new WebClaimListingPage(page);
    const join = new WebJoinPage(page);

    await claim.open(CLAIM_TOKEN);
    await claim.joinLink.click();
    await expect(join.heading).toHaveText('Create your profile');
    await join.fill({
      fullName: 'Grace Thompson',
      email: 'grace.thompson@gmail.com',
      password: 'abundantlife',
    });
    await join.submit();

    await expect.poll(() => claim.location()).toBe(`/claim/${CLAIM_TOKEN}`);
  });
});

// L2-078 AC5 and AC10 (ADR 0091; mocks `claim-listing/default`, `loading`): a signed-in member sees
// the listing as it will appear, both answers, that the link works once and when it expires; while
// the link is checked, skeletons show.
test.describe('Member app, claim a listing: signed in', () => {
  test('shows the listing as it will appear, with both answers and the link’s life', async ({
    page,
    api,
  }) => {
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.heading).toHaveText('Publish your listing');
    await expect(page).toHaveTitle('Claim a listing · Christian Fitness');
    await expect(claim.lead).toHaveText(
      'Our team has checked it. It goes into the directory only when you say it is yours. Here is how it will look.',
    );
    await expect(claim.kind).toHaveText('Organization · Verified');
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    await expect(claim.tagline).toHaveText(
      'Saturday morning strength group out of Danforth Baptist',
    );
    await expect(claim.about).toHaveText(
      'About 25 women, coached by a CSEP trainer. We pray before and after and are so welcoming to beginners.',
    );
    await expect(claim.tags).toHaveText(['Strength', 'Beginners', 'Women']);
    expect(await claim.factViews()).toEqual([
      { label: 'Area', value: 'East York' },
      { label: 'Website', value: 'eastsideladies.ca' },
    ]);
    await expect(claim.hint).toHaveText(
      'Signed in as Grace Thompson. Publishing makes you the owner, so you can edit it later. This link works once and expires on December 9.',
    );
    await expect(claim.publishButton).toHaveText('Publish my listing');
    await expect(claim.publishButton).toBeEnabled();
    await expect(claim.notMeButton).toBeEnabled();
  });

  test('a draft without a tagline, about or tags shows only what it has', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => ({
      json: {
        ...CLAIM_SIGNED_IN,
        listing: { ...CLAIM_SIGNED_IN.listing, tagline: '', about: '', focus: [], website: null },
      },
    }));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    await expect(claim.tagline).toHaveCount(0);
    await expect(claim.about).toHaveCount(0);
    await expect(claim.tags).toHaveCount(0);
    expect(await claim.factViews()).toEqual([{ label: 'Area', value: 'East York' }]);
  });

  test('skeletons show while the link is checked', async ({ page, api }) => {
    let answer: () => void = () => undefined;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('GET', CLAIM_PATH, async () => {
      await answered;
      return { json: CLAIM_SIGNED_IN };
    });
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.skeleton).toBeVisible();
    await expect(claim.heading).toHaveText('Checking your link');
    await expect(claim.publishButton).toHaveCount(0);
    answer();
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    await expect(claim.skeleton).toHaveCount(0);
  });

  test('Sign in brings the member straight back to the listing', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_OUT }));
    const claim = new WebClaimListingPage(page);
    const signIn = new WebSignInPage(page);

    await claim.open(CLAIM_TOKEN);
    await claim.signInLink.click();
    await expect(signIn.heading).toHaveText('Welcome back');
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    await signIn.fill('grace.thompson@gmail.com', 'abundantlife');
    await signIn.submit();

    await expect(claim.heading).toHaveText('Publish your listing');
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    expect(claim.location()).toBe(`/claim/${CLAIM_TOKEN}`);
  });
});
