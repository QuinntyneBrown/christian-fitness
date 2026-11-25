import { expect, SIGNED_IN, test } from '../fixtures/test';
import { answerAsVisitor, CLAIM_PATH, CLAIM_SIGNED_OUT, CLAIM_TOKEN } from '../fixtures/claims';
import { WebClaimListingPage } from '../page-objects/web/claim-listing.page';
import { WebJoinPage } from '../page-objects/web/join.page';

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
