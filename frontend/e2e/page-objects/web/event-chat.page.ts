import type { Locator, Page } from '@playwright/test';

/**
 * The member app's event group chat at `/events/:id/chat` (mock `docs/mocks/pages/messages/default`;
 * ADR 0039): the chat's name, the message thread and the composer. Owns the selectors of that screen.
 */
export class WebEventChatPage {
  readonly chatTitle: Locator;
  readonly subtitle: Locator;
  readonly backLink: Locator;
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

  constructor(private readonly page: Page) {
    this.cancelledNotice = page.getByRole('status').filter({ hasText: 'This event was cancelled' });
    this.chatTitle = page.locator('.chat-page__name');
    this.subtitle = page.locator('.chat-page__sub');
    this.backLink = page.getByRole('link', { name: 'Back to event' });
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

  async open(eventId: string): Promise<void> {
    await this.page.goto(`/events/${eventId}/chat`);
  }
}
