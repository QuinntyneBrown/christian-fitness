import type { Locator, Page } from '@playwright/test';

/**
 * The member app's event group chat at `/events/:id/chat` (mock `docs/mocks/pages/messages/default`;
 * ADR 0039): the chat's name, the message thread and the composer. Owns the selectors of that screen.
 */
export class WebEventChatPage {
  readonly chatTitle: Locator;
  readonly subtitle: Locator;
  readonly backLink: Locator;
  /** A series' chat (ADR 0099): the way back to the series page. */
  readonly seriesBackLink: Locator;
  readonly messages: Locator;
  readonly composerInput: Locator;
  readonly sendButton: Locator;
  readonly connecting: Locator;
  readonly refused: Locator;
  readonly sendError: Locator;
  readonly failed: Locator;
  readonly tryAgainButton: Locator;
  readonly earlierButton: Locator;
  readonly latestButton: Locator;
  readonly notSent: Locator;
  readonly retrySendButton: Locator;
  readonly cancelledNotice: Locator;
  /** A direct conversation (slice 14.1): the way back to Messages, and the refusal for a member who cannot be messaged. */
  readonly messagesLink: Locator;
  readonly unavailable: Locator;
  /** Report on received messages (slice 25.1; ADR 0000): one button per message from another member. */
  readonly reportButtons: Locator;
  /** The Christian Fitness account (ADR 0065): the note that replaces the composer, its link and a refused send. */
  readonly composerNote: Locator;
  readonly feedbackLink: Locator;
  readonly composerRefused: Locator;

  constructor(private readonly page: Page) {
    this.composerNote = page.locator('.composer__note');
    this.feedbackLink = this.composerNote.getByRole('link', { name: 'Send feedback' });
    this.composerRefused = page.locator('.composer__refused');
    this.cancelledNotice = page.getByRole('status').filter({ hasText: 'This event was cancelled' });
    this.messagesLink = page.getByRole('link', { name: 'Back to messages' });
    this.unavailable = page.getByRole('heading', { name: "You can't message this member" });
    this.reportButtons = page.getByRole('button', { name: /^Report message from / });
    this.chatTitle = page.locator('.chat-page__name');
    this.subtitle = page.locator('.chat-page__sub');
    this.backLink = page.getByRole('link', { name: 'Back to event' });
    this.seriesBackLink = page.getByRole('link', { name: 'Back to series' });
    this.messages = page.locator('.thread__messages .message');
    this.composerInput = page.getByRole('textbox', { name: /^Message / });
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.connecting = page.locator('[aria-busy="true"]');
    this.refused = page.getByRole('heading', { name: "You're not in this group chat" });
    this.sendError = page.locator('.chat-page__error');
    this.failed = page.getByRole('heading', { name: "This chat didn't open" });
    this.tryAgainButton = page.getByRole('button', { name: 'Try again' });
    this.earlierButton = page.getByRole('button', { name: 'Earlier messages' });
    this.latestButton = page.getByRole('button', { name: 'Back to the latest messages' });
    this.notSent = page.locator('.message--failed .message__error');
    this.retrySendButton = this.notSent.getByRole('button', { name: 'Try again' });
  }

  /** One message's author, text and time, read from the thread. */
  message(index: number): { author: Locator; bubble: Locator; time: Locator } {
    const item = this.messages.nth(index);
    return {
      author: item.locator('.message__author'),
      bubble: item.locator('.message__bubble'),
      time: item.locator('.message__time'),
    };
  }

  /** The Report button of the message at `index`. */
  reportButton(index: number): Locator {
    return this.messages.nth(index).locator('.message__report');
  }

  /** The text of the message at `index`. */
  text(index: number): Locator {
    return this.messages.nth(index).locator('.message__bubble');
  }

  /** The bubble that holds this text. */
  bubble(text: string): Locator {
    return this.page.locator('.message__bubble', { hasText: new RegExp(`^${text}$`) });
  }

  /** Scrolls the thread to its first message, as a member swiping down does. */
  async scrollToTop(): Promise<void> {
    await this.page.locator('.thread__messages').evaluate((list) => {
      list.scrollTop = 0;
    });
  }

  async openDirect(memberId: string): Promise<void> {
    await this.page.goto(`/messages/${memberId}`);
  }

  async open(eventId: string): Promise<void> {
    await this.page.goto(`/events/${eventId}/chat`);
  }

  /** A series' one group chat (ADR 0099), at `/events/series/:id/chat`. */
  async openSeries(seriesId: string): Promise<void> {
    await this.page.goto(`/events/series/${seriesId}/chat`);
  }
}
