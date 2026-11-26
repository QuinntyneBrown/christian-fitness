import { expect, test, XSRF_TOKEN, type ApiHandlers } from '../fixtures/test';
import { answerMostRead, MOST_READ } from '../fixtures/front-page';
import { WebLandingPage } from '../page-objects/web/landing.page';
import { WebSubscribePage } from '../page-objects/web/subscribe.page';

const EMAIL = 'grace.thompson@gmail.com';
const TOKEN = 'Ab-_0123456789abcdefghijklmnopqrstuvwxyzABC';
const SITE = 'https://www.christian.fitness';

/** The six feeds as `GET /api/public/feeds` answers them, All stories first. */
const FEEDS = [
  { name: 'All stories', url: `${SITE}/feed`, storiesPerWeek: 20, isAll: true },
  { name: 'Events', url: `${SITE}/events/feed`, storiesPerWeek: 6, isAll: false },
  { name: 'Training', url: `${SITE}/training/feed`, storiesPerWeek: 4, isAll: false },
  { name: 'Nutrition', url: `${SITE}/nutrition/feed`, storiesPerWeek: 3, isAll: false },
  { name: 'Faith & Body', url: `${SITE}/faith-body/feed`, storiesPerWeek: 3, isAll: false },
  { name: 'Community', url: `${SITE}/community/feed`, storiesPerWeek: 4, isAll: false },
];

function answerFeeds(api: ApiHandlers, feeds: unknown = FEEDS): void {
  api.on('GET', '/api/public/feeds', () => ({ json: feeds }));
}

interface Sent {
  body: unknown;
  token: string | undefined;
}

/** Answers each subscription with `status` (202 unless given) and records what was sent. */
function answerSubscribe(
  api: ApiHandlers,
  reply: { status: number; json?: unknown } = { status: 202 },
): Sent[] {
  const sent: Sent[] = [];
  api.on('POST', '/api/public/newsletter/subscriptions', (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    return reply;
  });
  return sent;
}

function asVisitor(api: ApiHandlers): void {
  api.on('GET', '/api/session', () => ({ status: 401, json: { code: 'unauthenticated' } }));
}

// L2-057 (journey 27; ADR 0110): anyone subscribes to The Abundant Weekly with an email and no
// account. Whether the address was already subscribed is the API's to keep (backend
// SubscribeTests); the screen says the same either way.
test.describe('Member app, subscribe to the newsletter', () => {
  test(
    'a visitor types an email in the landing page box, Subscribe opens with it, and they are told to check their inbox',
    { tag: '@critical' },
    async ({ page, api }) => {
      asVisitor(api);
      answerFeeds(api);
      const sent = answerSubscribe(api);
      const landing = new WebLandingPage(page);
      const subscribe = new WebSubscribePage(page);
      await landing.open();

      await landing.newsletterEmail.fill(EMAIL);
      await landing.newsletterSubscribe.click();

      await expect(subscribe.heading).toHaveText('The Abundant Weekly');
      expect(subscribe.location()).toBe('/subscribe');
      await expect(subscribe.email).toHaveValue(EMAIL);
      await subscribe.submitButton.click();

      await expect(subscribe.panelTitle).toHaveText('Check your inbox');
      await expect(subscribe.panel).toHaveAttribute('role', 'status');
      await expect(subscribe.panel).toBeFocused();
      await expect(subscribe.panelText).toHaveText(
        `We sent a confirmation link to ${EMAIL}. Tap it and your first issue arrives Saturday morning.`,
      );
      await expect(subscribe.panelEmail).toHaveText(EMAIL);
      await expect(subscribe.form).toHaveCount(0);
      expect(sent).toEqual([{ body: { email: EMAIL }, token: XSRF_TOKEN }]);
    },
  );

  test('the landing rail holds the newsletter box after Upcoming events and before Most read', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerMostRead(api, MOST_READ);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.mostRead).toBeVisible();
    expect(await landing.railHeadings()).toEqual([
      'Upcoming events',
      'The Abundant Weekly',
      'Most read',
    ]);
    await expect(landing.newsletterBox).toContainText(
      'The week’s stories and events in one email. Every Saturday, 7 AM.',
    );
    await expect(landing.followByRss).toHaveAttribute('href', '/subscribe#rss');
  });

  test('shows the page the mock draws, with no reader count and no add-on emails', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    const subscribe = new WebSubscribePage(page);

    await subscribe.open();

    await expect.poll(() => subscribe.title()).toBe('Subscribe · Christian Fitness');
    await expect(subscribe.backToNews).toHaveAttribute('href', '/');
    await expect(subscribe.heading).toHaveText('The Abundant Weekly');
    await expect(subscribe.lead).toHaveText(
      'The week in Christian fitness across the GTA: the stories worth reading, the events worth showing up for, and one verse to carry into your training. Every Saturday, 7 AM.',
    );
    await expect(subscribe.email).toHaveValue('');
    await expect(subscribe.email).toHaveAttribute('type', 'email');
    await expect(subscribe.email).toHaveAttribute('autocomplete', 'email');
    await expect(subscribe.submitButton).toHaveText('Subscribe free');
    await expect(subscribe.note).toHaveText(
      'One click to unsubscribe, and we never share your address.',
    );
    await expect(subscribe.main).not.toContainText('readers');
    await expect(subscribe.main).not.toContainText('Event alerts');
    await expect(subscribe.main).not.toContainText('Morning devotion');
    await expect(subscribe.main.getByRole('checkbox')).toHaveCount(0);
    await expect(subscribe.alert).toHaveCount(0);
  });

  test('a malformed email marks the field, sends nothing, and typing clears it', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    const sent = answerSubscribe(api);
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.subscribe('grace.thompson@gmail');

    await expect(subscribe.email).toHaveAttribute('aria-invalid', 'true');
    await expect(subscribe.email).toHaveAttribute('aria-describedby', 'f-email-error');
    await expect(subscribe.emailError).toHaveText(
      "That email doesn't look right. Check for a typo and try again.",
    );
    await subscribe.email.press('End');
    await subscribe.email.press('m');
    await expect(subscribe.email).not.toHaveAttribute('aria-invalid', 'true');
    await expect(subscribe.emailError).toHaveCount(0);
    expect(sent).toEqual([]);
  });

  test('while it sends, the button reads "Subscribing…" and is disabled, and the field is read-only', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('POST', '/api/public/newsletter/subscriptions', async () => {
      await held;
      return { status: 202 };
    });
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.subscribe(EMAIL);

    await expect(subscribe.submitButton).toHaveText('Subscribing…');
    await expect(subscribe.submitButton).toBeDisabled();
    await expect(subscribe.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(subscribe.email).toHaveAttribute('readonly', '');
    release();
    await expect(subscribe.panelTitle).toHaveText('Check your inbox');
  });

  test('when the server fails, a message above the form says so and the email stays', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    answerSubscribe(api, { status: 500, json: { code: 'error' } });
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.subscribe(EMAIL);

    await expect(subscribe.alertTitle).toHaveText("We couldn't subscribe you");
    await expect(subscribe.alertText).toHaveText(
      'Something went wrong on our side. Your email is still here, so try again in a moment.',
    );
    await expect(subscribe.alert).toBeFocused();
    await expect(subscribe.email).toHaveValue(EMAIL);
    await expect(subscribe.submitButton).toHaveText('Subscribe free');
  });

  test('when the network has added too many addresses this hour, a message says to try later', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    answerSubscribe(api, { status: 429, json: { code: 'too_many_attempts' } });
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.subscribe(EMAIL);

    await expect(subscribe.alertTitle).toHaveText('Too many sign-ups');
    await expect(subscribe.alertText).toHaveText(
      'Too many addresses were added from this network in the last hour. Try again later.',
    );
    await expect(subscribe.email).toHaveValue(EMAIL);
  });

  test('an address the API refuses marks the field', async ({ page, api }) => {
    answerFeeds(api);
    answerSubscribe(api, {
      status: 400,
      json: { code: 'validation_failed', fieldCodes: { email: 'email_invalid' } },
    });
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.subscribe('grace@example.org');

    await expect(subscribe.email).toHaveAttribute('aria-invalid', 'true');
    await expect(subscribe.emailError).toHaveText(
      "That email doesn't look right. Check for a typo and try again.",
    );
    await expect(subscribe.alert).toHaveCount(0);
  });

  test('"Use a different email" brings back the empty form, focused', async ({ page, api }) => {
    answerFeeds(api);
    answerSubscribe(api);
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();
    await subscribe.subscribe(EMAIL);
    await expect(subscribe.panelTitle).toHaveText('Check your inbox');

    await subscribe.differentEmail.click();

    await expect(subscribe.email).toHaveValue('');
    await expect(subscribe.email).toBeFocused();
    await expect(subscribe.panel).toHaveCount(0);
  });
});

// L2-058 AC2, AC3, AC5, AC7 (ADR 0110): an emailed link opens Subscribe with one token in the
// fragment, which leaves the address bar before the API is asked.
test.describe('Member app, confirm and unsubscribe', () => {
  test('a confirmation link subscribes the address and says when the first issue arrives', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    const bodies: unknown[] = [];
    const locations: string[] = [];
    const subscribe = new WebSubscribePage(page);
    api.on('POST', '/api/public/newsletter/confirmations', (request) => {
      bodies.push(request.postDataJSON());
      locations.push(subscribe.location());
      return { json: { email: EMAIL, firstIssueAt: '2026-11-28T12:00:00Z' } };
    });

    await subscribe.open(`confirm=${TOKEN}`);

    await expect(subscribe.panelTitle).toHaveText("You're subscribed");
    await expect(subscribe.panelText).toHaveText(
      `The Abundant Weekly will arrive at ${EMAIL} on Saturday at 7 AM.`,
    );
    await expect(subscribe.panel).toBeFocused();
    expect(bodies).toEqual([{ token: TOKEN }]);
    expect(locations).toEqual(['/subscribe']);
    expect(subscribe.location()).toBe('/subscribe');
  });

  test('while the link is checked, the state area says so and is busy', async ({ page, api }) => {
    answerFeeds(api);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('POST', '/api/public/newsletter/confirmations', async () => {
      await held;
      return { json: { email: EMAIL, firstIssueAt: '2026-11-28T12:00:00Z' } };
    });
    const subscribe = new WebSubscribePage(page);

    await subscribe.open(`confirm=${TOKEN}`);

    await expect(subscribe.checking).toHaveText('Checking your link…');
    await expect(subscribe.checking).toHaveAttribute('aria-busy', 'true');
    await expect(subscribe.form).toHaveCount(0);
    release();
    await expect(subscribe.panelTitle).toHaveText("You're subscribed");
  });

  test('an expired, used or unknown link says so and shows the empty form again', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    api.on('POST', '/api/public/newsletter/confirmations', () => ({
      status: 400,
      json: { code: 'subscription_link_expired' },
    }));
    const subscribe = new WebSubscribePage(page);

    await subscribe.open(`confirm=${TOKEN}`);

    await expect(subscribe.alertTitle).toHaveText('That link has expired');
    await expect(subscribe.alertText).toHaveText(
      "Confirmation links last 7 days. Enter your email again and we'll send a new one.",
    );
    await expect(subscribe.alert).toHaveAttribute('role', 'alert');
    await expect(subscribe.email).toHaveValue('');
    await expect(subscribe.panel).toHaveCount(0);
    expect(subscribe.location()).toBe('/subscribe');
  });

  test('a confirmation the server fails to check shows the error above the form', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    api.on('POST', '/api/public/newsletter/confirmations', () => ({
      status: 500,
      json: { code: 'error' },
    }));
    const subscribe = new WebSubscribePage(page);

    await subscribe.open(`confirm=${TOKEN}`);

    await expect(subscribe.alertTitle).toHaveText("We couldn't subscribe you");
    await expect(subscribe.email).toHaveValue('');
  });

  test('an Unsubscribe link unsubscribes without typing anything, and Subscribe again brings back the form', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    const bodies: unknown[] = [];
    api.on('POST', '/api/public/newsletter/unsubscriptions', (request) => {
      bodies.push(request.postDataJSON());
      return { json: { email: EMAIL } };
    });
    const subscribe = new WebSubscribePage(page);

    await subscribe.open(`unsubscribe=${TOKEN}`);

    await expect(subscribe.panelTitle).toHaveText("You're unsubscribed");
    await expect(subscribe.panelText).toHaveText(
      `We won't email ${EMAIL} again. Changed your mind? You can subscribe again any time.`,
    );
    await expect(subscribe.panel).toBeFocused();
    expect(bodies).toEqual([{ token: TOKEN }]);
    expect(subscribe.location()).toBe('/subscribe');

    await subscribe.subscribeAgain.click();

    await expect(subscribe.email).toHaveValue(EMAIL);
    await expect(subscribe.email).toBeFocused();
  });

  test('an Unsubscribe link whose address is gone says the same without naming one', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    api.on('POST', '/api/public/newsletter/unsubscriptions', () => ({ json: { email: null } }));
    const subscribe = new WebSubscribePage(page);

    await subscribe.open(`unsubscribe=${TOKEN}`);

    await expect(subscribe.panelTitle).toHaveText("You're unsubscribed");
    await expect(subscribe.panelText).toHaveText(
      "We won't email you again. Changed your mind? You can subscribe again any time.",
    );
    await expect(subscribe.panelEmail).toHaveCount(0);
  });
});

// L2-060 AC4 and L2-057 AC1 (ADR 0110): Subscribe lists the feeds, All stories first, and the
// landing page's "Or follow by RSS" and the footer lead to them.
test.describe('Member app, the feeds on Subscribe', () => {
  test('lists every feed with its rate, its address, Copy URL and Open in Feedly', async ({
    page,
    api,
  }) => {
    answerFeeds(api);
    const subscribe = new WebSubscribePage(page);

    await subscribe.open();

    await expect(subscribe.rssTitle).toHaveText('Prefer RSS?');
    await expect(subscribe.rssText).toHaveText(
      'Follow every story, or just the sections you care about, in Feedly, Inoreader, NetNewsWire or any reader. No email or account needed.',
    );
    await expect(subscribe.feeds).toHaveCount(6);
    const feedly = (path: string) =>
      `https://feedly.com/i/subscription/feed/${encodeURIComponent(SITE + path)}`;
    expect(await subscribe.feedRows()).toEqual([
      {
        name: 'All stories',
        count: '~20 a week',
        url: `${SITE}/feed`,
        copy: 'Copy URL of the All stories feed',
        feedly: feedly('/feed'),
        all: true,
      },
      {
        name: 'Events',
        count: '~6 a week',
        url: `${SITE}/events/feed`,
        copy: 'Copy URL of the Events feed',
        feedly: feedly('/events/feed'),
        all: false,
      },
      {
        name: 'Training',
        count: '~4 a week',
        url: `${SITE}/training/feed`,
        copy: 'Copy URL of the Training feed',
        feedly: feedly('/training/feed'),
        all: false,
      },
      {
        name: 'Nutrition',
        count: '~3 a week',
        url: `${SITE}/nutrition/feed`,
        copy: 'Copy URL of the Nutrition feed',
        feedly: feedly('/nutrition/feed'),
        all: false,
      },
      {
        name: 'Faith & Body',
        count: '~3 a week',
        url: `${SITE}/faith-body/feed`,
        copy: 'Copy URL of the Faith & Body feed',
        feedly: feedly('/faith-body/feed'),
        all: false,
      },
      {
        name: 'Community',
        count: '~4 a week',
        url: `${SITE}/community/feed`,
        copy: 'Copy URL of the Community feed',
        feedly: feedly('/community/feed'),
        all: false,
      },
    ]);
    await expect(subscribe.feedly('Events')).toHaveAttribute('target', '_blank');
    await expect(subscribe.feedly('Events')).toHaveAccessibleName(
      'Open in Feedly the Events feed (opens in a new tab)',
    );
  });

  test('Copy URL puts the feed on the clipboard and reads "Copied" for a moment', async ({
    page,
    api,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.clock.install({ time: new Date('2026-11-26T14:00:00Z') });
    answerFeeds(api);
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.copyButton('Events').click();

    await expect(subscribe.copyButton('Events')).toHaveText('Copied of the Events feed');
    await expect(subscribe.copyButton('All stories')).toHaveText(
      'Copy URL of the All stories feed',
    );
    await expect(subscribe.copyStatus).toHaveText('Feed address copied');
    expect(await subscribe.clipboard()).toBe(`${SITE}/events/feed`);
    // The exact 2,000 ms is CopiedFlag's unit test.
    await page.clock.fastForward(2_000);
    await expect(subscribe.copyButton('Events')).toHaveText('Copy URL of the Events feed');
    await expect(subscribe.copyStatus).toHaveText('');
  });

  test('when the clipboard refuses, the address shows selected so it can be copied by hand', async ({
    page,
    api,
  }) => {
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () =>
        Promise.reject(new DOMException('Refused', 'NotAllowedError'));
    });
    answerFeeds(api);
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await subscribe.copyButton('Nutrition').click();

    await expect.poll(() => subscribe.selection()).toBe(`${SITE}/nutrition/feed`);
    await expect(subscribe.copyButton('Nutrition')).toHaveText('Copy URL of the Nutrition feed');
  });

  test('when the feeds get no answer, no list shows and the form still works', async ({
    page,
    api,
  }) => {
    // A 5xx GET opens the server-error screen app-wide (L2-043 AC4); a feed list that gets no
    // answer shows none.
    api.on('GET', '/api/public/feeds', () => ({ abort: true }));
    answerSubscribe(api);
    const subscribe = new WebSubscribePage(page);
    await subscribe.open();

    await expect(subscribe.rssTitle).toHaveText('Prefer RSS?');
    await expect(subscribe.feeds).toHaveCount(0);
    await subscribe.subscribe(EMAIL);
    await expect(subscribe.panelTitle).toHaveText('Check your inbox');
  });

  test('"Or follow by RSS" on the landing page opens Subscribe at its feeds', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerFeeds(api);
    const landing = new WebLandingPage(page);
    const subscribe = new WebSubscribePage(page);
    await landing.open();

    await landing.followByRss.click();

    await expect.poll(() => subscribe.location()).toBe('/subscribe#rss');
    await expect(subscribe.rssTitle).toBeFocused();
    await expect(subscribe.rssTitle).toBeInViewport();
  });

  test('a link to Subscribe at #rss focuses the feeds', async ({ page, api }) => {
    answerFeeds(api);
    const subscribe = new WebSubscribePage(page);

    await subscribe.open('rss');

    await expect(subscribe.rssTitle).toBeFocused();
    expect(subscribe.location()).toBe('/subscribe#rss');
  });
});
