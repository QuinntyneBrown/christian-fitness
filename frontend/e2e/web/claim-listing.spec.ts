import { expect, SIGNED_IN, test } from '../fixtures/test';
import {
  answerAsVisitor,
  CLAIM_PATH,
  CLAIM_SIGNED_IN,
  CLAIM_SIGNED_OUT,
  CLAIM_TOKEN,
  refusal,
} from '../fixtures/claims';
import { WebClaimListingPage } from '../page-objects/web/claim-listing.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';
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

const LISTING_ID = '0193a9c0-0000-7000-8000-0000000e1a51';

// L2-078 AC6 and AC10 (ADR 0091; mocks `claim-listing/busy`, `published`, `error`): Publish my
// listing reads "Publishing…" with both answers disabled; on success "Your listing is live" offers
// the listing and the directory; a failure says nothing was published and both answers stay.
test.describe('Member app, claim a listing: publish', () => {
  test(
    'publishing makes the listing live and offers it and the directory',
    { tag: '@critical' },
    async ({ page, api }) => {
      api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
      let answer: () => void = () => undefined;
      const answered = new Promise<void>((resolve) => (answer = resolve));
      let sent = 0;
      api.on('POST', `${CLAIM_PATH}/publish`, async () => {
        sent += 1;
        await answered;
        return { json: { listingId: LISTING_ID } };
      });
      const claim = new WebClaimListingPage(page);

      await claim.open(CLAIM_TOKEN);
      await claim.publish();

      await expect(claim.publishButton).toHaveText('Publishing…');
      await expect(claim.publishButton).toBeDisabled();
      await expect(claim.notMeButton).toBeDisabled();
      answer();
      await expect(claim.doneTitle).toHaveText('Your listing is live');
      await expect(claim.done).toHaveAttribute('role', 'status');
      await expect(claim.done).toBeFocused();
      await expect(claim.doneText).toHaveText(
        'Eastside Ladies Who Lift is in the directory and you own it. You can edit it any time from its page.',
      );
      expect(await claim.doneLinks()).toEqual([
        { name: 'See your listing', href: `/directory/${LISTING_ID}` },
        { name: 'Back to the directory', href: '/directory' },
      ]);
      expect(sent).toBe(1);
    },
  );

  test('a failed publish says nothing was published and keeps both answers', async ({
    page,
    api,
  }) => {
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    api.on('POST', `${CLAIM_PATH}/publish`, () => refusal(500, 'error'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);
    await claim.publish();

    await expect(claim.alertTitle).toHaveText("We couldn't publish your listing");
    await expect(claim.alertText).toHaveText(
      'Something went wrong on our side. Nothing was published, so try again in a moment.',
    );
    await expect(claim.alert).toBeFocused();
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    await expect(claim.publishButton).toHaveText('Publish my listing');
    await expect(claim.publishButton).toBeEnabled();
    await expect(claim.notMeButton).toBeEnabled();

    api.on('POST', `${CLAIM_PATH}/publish`, () => ({ json: { listingId: LISTING_ID } }));
    await claim.publish();
    await expect(claim.doneTitle).toHaveText('Your listing is live');
  });
});

// L2-078 AC7 (ADR 0091; mock `claim-listing/declined`): "This isn't me" disables both answers while
// it waits, then thanks the member, says nothing is published and the team is told; a failure says
// nothing changed and keeps both answers.
test.describe('Member app, claim a listing: this isn’t me', () => {
  test('saying it isn’t them thanks them and publishes nothing', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    let answer: () => void = () => undefined;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    let published = 0;
    api.on('POST', `${CLAIM_PATH}/publish`, () => {
      published += 1;
      return { json: { listingId: LISTING_ID } };
    });
    api.on('POST', `${CLAIM_PATH}/decline`, async () => {
      await answered;
      return { json: { listingId: LISTING_ID } };
    });
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);
    await claim.notMe();

    await expect(claim.notMeButton).toBeDisabled();
    await expect(claim.notMeButton).toHaveAttribute('aria-busy', 'true');
    await expect(claim.publishButton).toBeDisabled();
    answer();
    await expect(claim.doneTitle).toHaveText('Thanks for letting us know');
    await expect(claim.done).toBeFocused();
    await expect(claim.doneText).toHaveText(
      'We won’t publish this listing, and we’ve told the team. Nothing about you was shared.',
    );
    expect(await claim.doneLinks()).toEqual([
      { name: 'Back to the directory', href: '/directory' },
    ]);
    expect(published).toBe(0);
  });

  test('a failed answer says nothing changed and keeps both answers', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    api.on('POST', `${CLAIM_PATH}/decline`, () => refusal(503, 'error'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);
    await claim.notMe();

    await expect(claim.alertTitle).toHaveText("We couldn't send your answer");
    await expect(claim.alertText).toHaveText(
      'Something went wrong on our side. Nothing changed, so try again in a moment.',
    );
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
    await expect(claim.publishButton).toBeEnabled();
    await expect(claim.notMeButton).toBeEnabled();
  });
});

// L2-078 AC8 (ADR 0091; mocks `claim-listing/expired`, `claimed`, `signed-out-expired`,
// `signed-out-claimed`): an expired link says so and offers to ask for a new one; a used one says it
// works once; either answered after the link was opened ends the same way. An unknown link is the
// app's 404, and a check that fails offers Try again.
test.describe('Member app, claim a listing: a link that no longer works', () => {
  test('an expired link says so and offers to ask for a new one', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => refusal(410, 'claim_link_expired'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.doneTitle).toHaveText('This link has expired');
    await expect(claim.done).toHaveAttribute('role', 'alert');
    await expect(claim.doneText).toHaveText('This link has expired. Ask us for a new one.');
    expect(await claim.doneLinks()).toEqual([
      { name: 'Ask us for a new one', href: '/feedback' },
      { name: 'Back to the directory', href: '/directory' },
    ]);
    await expect(claim.preview).toHaveCount(0);
  });

  test('a used link says it works once', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => refusal(409, 'claim_link_used'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.doneTitle).toHaveText('This listing has already been claimed');
    await expect(claim.done).toHaveAttribute('role', 'status');
    await expect(claim.doneText).toHaveText(
      'A link works once. If that was you, find your listing in the directory and use Edit listing.',
    );
    expect(await claim.doneLinks()).toEqual([
      { name: 'Back to the directory', href: '/directory' },
    ]);
  });

  for (const [status, code, title] of [
    [410, 'claim_link_expired', 'This link has expired'],
    [409, 'claim_link_used', 'This listing has already been claimed'],
  ] as const) {
    test(`an answer refused ${code} ends on that outcome`, async ({ page, api }) => {
      api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
      api.on('POST', `${CLAIM_PATH}/publish`, () => refusal(status, code));
      const claim = new WebClaimListingPage(page);

      await claim.open(CLAIM_TOKEN);
      await claim.publish();

      await expect(claim.doneTitle).toHaveText(title);
      await expect(claim.alert).toHaveCount(0);
    });
  }

  test('an unknown link is the app’s 404', async ({ page, api }) => {
    api.on('GET', CLAIM_PATH, () => refusal(404, 'claim_not_found'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.notFoundHeading).toHaveText('Page not found');
    await expect(claim.preview).toHaveCount(0);
  });

  test('a check that fails is the app’s server error, whose Try again shows the listing', async ({
    page,
    api,
  }) => {
    api.on('GET', CLAIM_PATH, () => refusal(500, 'error'));
    const claim = new WebClaimListingPage(page);
    const failed = new WebServerErrorPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(failed.heading).toHaveText('Something went wrong');
    await expect(failed.action('Try again')).toHaveAttribute('href', `/claim/${CLAIM_TOKEN}`);
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_IN }));
    await failed.action('Try again').click();
    await expect(claim.name).toHaveText('Eastside Ladies Who Lift');
  });
});

test.describe('Member app, claim a listing: a link that no longer works, signed out', () => {
  for (const [status, code, title, lead] of [
    [
      410,
      'claim_link_expired',
      'This link has expired',
      'This link has expired. Ask us for a new one.',
    ],
    [
      409,
      'claim_link_used',
      'This listing has already been claimed',
      'A link works once. If that was you, sign in, find your listing in the directory and use Edit listing.',
    ],
  ] as const) {
    test(`a visitor with a link refused ${code} is told so and offered Sign in`, async ({
      page,
      api,
    }) => {
      answerAsVisitor(api, SIGNED_IN);
      api.on('GET', CLAIM_PATH, () => refusal(status, code));
      const claim = new WebClaimListingPage(page);

      await claim.open(CLAIM_TOKEN);

      await expect(claim.cardHeading).toHaveText(title);
      await expect(claim.cardLead).toHaveText(lead);
      await expect(claim.signInLink).toHaveAttribute('href', `/sign-in?${RETURN}`);
      await expect(claim.joinLink).toHaveCount(0);
    });
  }

  test('a visitor with an unknown link sees the app’s 404', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    api.on('GET', CLAIM_PATH, () => refusal(404, 'claim_not_found'));
    const claim = new WebClaimListingPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(claim.notFoundHeading).toHaveText('Page not found');
    await expect(claim.card).toHaveCount(0);
  });

  test('a visitor whose check fails sees the app’s server error and can try again', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    api.on('GET', CLAIM_PATH, () => refusal(500, 'error'));
    const claim = new WebClaimListingPage(page);
    const failed = new WebServerErrorPage(page);

    await claim.open(CLAIM_TOKEN);

    await expect(failed.heading).toHaveText('Something went wrong');
    api.on('GET', CLAIM_PATH, () => ({ json: CLAIM_SIGNED_OUT }));
    await failed.action('Try again').click();
    await expect(claim.cardHeading).toHaveText('Claim Eastside Ladies Who Lift');
  });
});
