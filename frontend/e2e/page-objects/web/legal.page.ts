import type { Page } from '@playwright/test';

export class LegalPage {
  get changeBanner() {
    return this.page.getByRole('status').filter({ hasText: "We're updating our " });
  }
  get changeLink() {
    return this.changeBanner.getByRole('link', { name: "Read what's changing." });
  }
  get dismissChange() {
    return this.changeBanner.getByRole('button', { name: 'Dismiss' });
  }
  constructor(private readonly page: Page) {}
  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }
  get summary() {
    return this.page.getByRole('heading', { name: 'The short version' });
  }
  get note() {
    return this.page.locator('.legal__summary-note');
  }
  get eventTerms() {
    return this.page.locator('#events');
  }
  get collection() {
    return this.page.locator('#collect');
  }
  get feedbackLink() {
    return this.contact.getByRole('link', { name: 'Send feedback' });
  }
  get contentsLinks() {
    return this.contents.getByRole('link');
  }
  get contact() {
    return this.page.locator('.legal__questions');
  }
  get contents() {
    return this.page.getByRole('navigation', { name: 'Contents' });
  }
  contentsLink(index: number) {
    return this.contents.getByRole('link').nth(index);
  }
  async headingTop(index: number) {
    return this.sections.nth(index).evaluate((el) => el.getBoundingClientRect().top);
  }
  async headerBottom() {
    return this.page.getByRole('banner').evaluate((el) => el.getBoundingClientRect().bottom);
  }
  get changeSummary() {
    return this.page.locator('#whats-changing');
  }
  get sections() {
    return this.page.locator('.legal__section h2');
  }
  hasHorizontalOverflow() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }
  get currentVersion() {
    return this.page.getByRole('link', { name: 'Read the current version' });
  }
  get effective() {
    return this.page.locator('.legal__effective');
  }
  headerLink(name: string) {
    return this.page.getByRole('banner').getByRole('link', { name });
  }
  open(path: string) {
    return this.page.goto(path);
  }
}
