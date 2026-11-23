import { TestBed } from '@angular/core/testing';
import { Composer } from './composer';
import { Thread, type ThreadEntry } from './thread';

const entries: readonly ThreadEntry[] = [
  { kind: 'day', id: 'd1', label: 'Today' },
  { kind: 'message', id: 'm1', author: 'Danielle Okafor', text: 'Morning team!', time: '7:58 AM' },
  { kind: 'message', id: 'm2', text: 'I’ll drive from Scarborough.', time: '8:41 AM', mine: true },
  {
    kind: 'message',
    id: 'm3',
    text: 'See you <b>Saturday</b>!',
    time: '8:42 AM',
    mine: true,
    failed: true,
  },
];

async function thread() {
  const fixture = TestBed.createComponent(Thread);
  fixture.componentRef.setInput('label', 'Sunrise 5K Crew');
  fixture.componentRef.setInput('entries', entries);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const retried: string[] = [];
  fixture.componentInstance.retry.subscribe((id) => retried.push(id));
  return { el, retried };
}

async function composer(draft = '') {
  const fixture = TestBed.createComponent(Composer);
  fixture.componentRef.setInput('label', 'Message Sunrise 5K Crew');
  fixture.componentRef.setInput('draft', draft);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const sent: string[] = [];
  fixture.componentInstance.send.subscribe((text) => sent.push(text));
  return {
    fixture,
    el,
    sent,
    input: el.querySelector('input') as HTMLInputElement,
    button: el.querySelector('.composer__send') as HTMLButtonElement,
  };
}

describe('Thread', () => {
  it('is an ordered list in a labelled section, with day separators', async () => {
    const { el } = await thread();

    expect(el.querySelector('section')?.getAttribute('aria-label')).toBe('Sunrise 5K Crew');
    const items = Array.from(el.querySelectorAll('ol > li'));
    expect(items).toHaveLength(4);
    expect(items[0].textContent?.trim()).toBe('Today');
  });

  it('names the author of a received message, never of my own', async () => {
    const { el } = await thread();
    const [, received, mine] = Array.from(el.querySelectorAll('ol > li'));

    expect(received.querySelector('.message__author')?.textContent).toBe('Danielle Okafor');
    expect(mine.querySelector('.message__author')).toBeNull();
  });

  it('keeps a failed message’s text, announces "Not sent." and retries it by id', async () => {
    const { el, retried } = await thread();
    const failed = el.querySelectorAll('ol > li')[3];

    expect(failed.querySelector('.message__bubble')?.textContent).toBe('See you <b>Saturday</b>!');
    expect(failed.querySelector('b')).toBeNull();
    const error = failed.querySelector('.message__error') as HTMLElement;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Not sent.');
    (error.querySelector('button') as HTMLButtonElement).click();

    expect(retried).toEqual(['m3']);
  });
});

describe('Composer', () => {
  it('labels its field and names Send for assistive technology', async () => {
    const { el, input, button } = await composer();

    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toBe('Message Sunrise 5K Crew');
    expect(label.htmlFor).toBe(input.id);
    expect(button.getAttribute('aria-label')).toBe('Send');
  });

  // Send is enabled only with text to send (message.html, "States").
  it.each<[string, boolean]>([
    ['', true],
    ['   ', true],
    ['See you Saturday!', false],
  ])('with a draft of %j, Send is disabled: %s', async (draft, disabled) => {
    const { button } = await composer(draft);

    expect(button.disabled).toBe(disabled);
  });

  it('sends the trimmed text on submit and empties the field', async () => {
    const { fixture, el, sent, input } = await composer();

    input.value = '  On my way  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();

    expect(sent).toEqual(['On my way']);
    expect(input.value).toBe('');
  });
});
