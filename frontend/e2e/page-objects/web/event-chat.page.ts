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

  constructor(private readonly page: Page) {
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

  async open(eventId: string): Promise<void> {
    await this.page.goto(`/events/${eventId}/chat`);
  }
}
