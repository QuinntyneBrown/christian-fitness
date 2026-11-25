import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Community Pick page (mock `docs/mocks/pages/admin-community-pick/`): the event
 * choices, the note, Create assets, the preview before anything is made, the platform switch, the
 * assets and caption of the platform shown, and the loading, empty and error states. Owns the
 * selectors of that screen.
 */
export class CommunityPickPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly eventGroup: Locator;
  readonly choices: Locator;
  readonly radios: Locator;
  readonly note: Locator;
  readonly noteHint: Locator;
  readonly createButton: Locator;
  readonly changedNotice: Locator;
  readonly failure: Locator;
  readonly assetsRegion: Locator;
  readonly preview: Locator;
  readonly previewArt: Locator;
  readonly previewTitle: Locator;
  readonly previewText: Locator;
  readonly platforms: Locator;
  readonly platformLinks: Locator;
  readonly currentPlatform: Locator;
  readonly assets: Locator;
  readonly assetLabels: Locator;
  readonly assetImages: Locator;
  readonly downloadButtons: Locator;
  readonly caption: Locator;
  readonly captionText: Locator;
  readonly captionHint: Locator;
  readonly copyButton: Locator;
  readonly copyStatus: Locator;
  readonly slackPreview: Locator;
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly goToEvents: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.eventGroup = this.main.getByRole('group', { name: 'Event' });
    this.choices = this.eventGroup.locator('.event-choice');
    this.radios = this.eventGroup.getByRole('radio');
    this.note = this.main.getByRole('textbox', { name: 'Why it’s a pick' });
    this.noteHint = this.main.locator('#f-note-hint');
    this.createButton = this.main.getByRole('button', {
      name: /^(Create|Recreate) assets$|^Creating…$/,
    });
    this.changedNotice = this.main.locator('form .caption__hint[role="status"]');
    this.failure = this.main.locator('.register__error[role="alert"]');
    this.assetsRegion = this.main.getByRole('region', { name: 'Assets' });
    this.preview = this.assetsRegion.locator('.pick-empty');
    this.previewArt = this.preview.locator('.pick-art');
    this.previewTitle = this.preview.locator('.pick-empty__title');
    this.previewText = this.preview.locator('.pick-empty__text');
    this.platforms = this.assetsRegion.getByRole('navigation', { name: 'Platform' });
    this.platformLinks = this.platforms.getByRole('link');
    this.currentPlatform = this.platforms.locator('[aria-current="page"]');
    this.assets = this.assetsRegion.locator('figure.asset');
    this.assetLabels = this.assets.locator('.asset__label');
    this.assetImages = this.assets.locator('.pick-art img');
    this.downloadButtons = this.assets.getByRole('button', { name: /^PNG/ });
    this.caption = this.assetsRegion.locator('.caption');
    this.captionText = this.caption.locator('.caption__text');
    this.captionHint = this.caption.locator('p.caption__hint');
    this.copyButton = this.caption.getByRole('button', { name: /^(Copy|Copied) caption$/ });
    this.copyStatus = this.caption.locator('[role="status"]');
    this.slackPreview = this.assetsRegion.getByLabel('How the post will look in Slack');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.loadingLabel = this.loading.locator('.visually-hidden');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state:not(.error-state)');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.goToEvents = this.empty.getByRole('link', { name: 'Go to Events' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
  }

  /** Opens Community Pick, with `query` (such as `event=<id>`) when given. */
  async open(query?: string): Promise<void> {
    await this.page.goto(query ? `/community-pick?${query}` : '/community-pick');
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  /** Each choice's date, title and area, as read. */
  async choiceTexts(): Promise<string[][]> {
    return this.choices.evaluateAll((choices) =>
      choices.map((choice) =>
        ['.event-choice__when', '.event-choice__title', '.event-choice__area'].map(
          (part) => choice.querySelector(part)?.textContent?.trim() ?? '',
        ),
      ),
    );
  }

  /** The radio of the event titled `title`. */
  radio(title: string): Locator {
    return this.eventGroup.getByRole('radio', { name: new RegExp(escape(title)) });
  }

  /** Chooses the event titled `title` by its label. */
  async choose(title: string): Promise<void> {
    await this.choices.filter({ hasText: title }).click();
  }

  /** Replaces the note with `text`. */
  async writeNote(text: string): Promise<void> {
    await this.note.fill(text);
  }

  /** Presses Create assets (or Recreate assets). */
  async create(): Promise<void> {
    await this.createButton.click();
  }

  /** Follows the platform link named `name`. */
  async showPlatform(name: string): Promise<void> {
    await this.platformLinks.filter({ hasText: name }).click();
  }

  /** The PNG button of the asset whose label starts with `label` ("Post", "Story"). */
  download(label: string): Locator {
    return this.assets
      .filter({ has: this.page.locator('.asset__label', { hasText: label }) })
      .getByRole('button', { name: /^PNG/ });
  }

  /** The preview art's text: its label, title, when line and note. */
  async previewArtTexts(): Promise<string[]> {
    return this.previewArt.evaluate((art) =>
      ['.pick-art__label', '.pick-art__title', '.pick-art__when', '.pick-art__note'].map(
        (part) => art.querySelector(part)?.textContent?.trim() ?? '',
      ),
    );
  }
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
