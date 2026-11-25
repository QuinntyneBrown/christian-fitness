import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's story editor (mock `docs/mocks/pages/admin-story-editor/`): the bar with the way
 * back, the status, when it was saved, Preview and the actions; the Headline, Summary and Story;
 * the alert above the story; and the Publishing panel. Owns the selectors of that screen.
 */
export class StoryEditorPage {
  readonly main: Locator;
  readonly editor: Locator;
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly status: Locator;
  readonly saved: Locator;
  readonly actions: Locator;
  readonly headline: Locator;
  readonly summary: Locator;
  readonly story: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly loadNewerButton: Locator;
  readonly keepMineButton: Locator;
  readonly publishing: Locator;
  readonly placement: Locator;
  readonly weekly: Locator;
  readonly section: Locator;
  readonly byline: Locator;
  readonly pointsTo: Locator;
  readonly nextStepText: Locator;
  readonly nextStepLink: Locator;
  readonly slug: Locator;
  readonly slugPrefix: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly errorStoriesLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.editor = this.main.locator('form.editor');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.backLink = this.main.locator('.back-link');
    this.status = this.editor.locator('.editor__bar .status');
    this.saved = this.editor.locator('.editor__saved');
    this.actions = this.editor.locator('.editor__actions');
    this.headline = this.editor.getByRole('textbox', { name: 'Headline', exact: true });
    this.summary = this.editor.getByRole('textbox', { name: 'Summary', exact: true });
    this.story = this.editor.getByRole('textbox', { name: 'Story', exact: true });
    this.alert = this.editor.locator('.editor__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.loadNewerButton = this.alert.getByRole('button', { name: 'Load the newer version' });
    this.keepMineButton = this.alert.getByRole('button', { name: 'Keep my version' });
    this.publishing = this.main.getByRole('complementary', { name: 'Publishing' });
    this.placement = this.publishing.getByLabel('Front page');
    this.weekly = this.publishing.getByRole('checkbox', { name: /Include in the Weekly/ });
    this.section = this.publishing.getByLabel('Section');
    this.byline = this.publishing.getByLabel('Byline', { exact: true });
    this.pointsTo = this.publishing.getByLabel('Points readers to');
    this.nextStepText = this.publishing.getByRole('textbox', { name: /^Next step \(optional\)$/ });
    this.nextStepLink = this.publishing.getByRole('textbox', { name: /^Next step link/ });
    this.slug = this.publishing.getByRole('textbox', { name: 'Link', exact: true });
    this.slugPrefix = this.publishing.locator('.input-group__prefix');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.errorStoriesLink = this.error.getByRole('link', { name: 'Stories' });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/stories/${id}`);
  }

  async openNew(): Promise<void> {
    await this.page.goto('/stories/new');
  }

  /** The options of a select, for a retrying check of their words. */
  options(select: Locator): Locator {
    return select.locator('option');
  }

  /** The text of the selected option of a select. */
  async selectedText(select: Locator): Promise<string> {
    return (await select.locator('option:checked').textContent())?.trim() ?? '';
  }

  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
