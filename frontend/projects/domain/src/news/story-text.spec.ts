import type { StoryRun } from '@cf/api';
import { storyBlocks, storyRuns } from './story-text';

const plain = (text: string): StoryRun => ({ text, em: false, strong: false, href: null });
const em = (text: string): StoryRun => ({ text, em: true, strong: false, href: null });
const strong = (text: string): StoryRun => ({ text, em: false, strong: true, href: null });
const link = (text: string, href: string): StoryRun => ({
  text,
  em: false,
  strong: false,
  href,
});

// L2-069 AC10 (ADR 0097): one row per rule of the small Markdown subset.
describe('storyBlocks', () => {
  it.each([
    ['nothing', '', []],
    ['only blank lines', '\n \n\n', []],
    ['one paragraph', 'One line.', [{ kind: 'paragraph', runs: [plain('One line.')] }]],
    [
      'lines of a paragraph joined by a space',
      'First line\nsecond line',
      [{ kind: 'paragraph', runs: [plain('First line second line')] }],
    ],
    [
      'paragraphs split by a blank line, Windows line ends too',
      'One.\r\n\r\nTwo.',
      [
        { kind: 'paragraph', runs: [plain('One.')] },
        { kind: 'paragraph', runs: [plain('Two.')] },
      ],
    ],
    [
      'a paragraph beginning with > as a pull quote',
      '> “Fasting and training\ncan live together.”',
      [{ kind: 'quote', runs: [plain('“Fasting and training can live together.”')] }],
    ],
    [
      'every line of a quote may carry >',
      '>One\n> two',
      [{ kind: 'quote', runs: [plain('One two')] }],
    ],
    [
      '## as a heading',
      '## Before you start',
      [{ kind: 'heading', level: 2, runs: [plain('Before you start')] }],
    ],
    [
      '### as a smaller heading',
      '### Water',
      [{ kind: 'heading', level: 3, runs: [plain('Water')] }],
    ],
    ['# is not a heading', '# Big', [{ kind: 'paragraph', runs: [plain('# Big')] }]],
    ['#### is not a heading', '#### Small', [{ kind: 'paragraph', runs: [plain('#### Small')] }]],
    ['an empty heading is dropped', '## ', []],
    [
      'a heading ends the paragraph before it',
      'Text\n## Next',
      [
        { kind: 'paragraph', runs: [plain('Text')] },
        { kind: 'heading', level: 2, runs: [plain('Next')] },
      ],
    ],
    [
      'a bulleted list with - or *',
      '- Water\n* Salt',
      [{ kind: 'list', ordered: false, items: [[plain('Water')], [plain('Salt')]] }],
    ],
    [
      'a numbered list',
      '1. Drink\n2. Rest',
      [{ kind: 'list', ordered: true, items: [[plain('Drink')], [plain('Rest')]] }],
    ],
    [
      'a list ends the paragraph before it',
      'Bring:\n- Water',
      [
        { kind: 'paragraph', runs: [plain('Bring:')] },
        { kind: 'list', ordered: false, items: [[plain('Water')]] },
      ],
    ],
    [
      'a line under an item carries on that item',
      '- Water,\n  and more',
      [{ kind: 'list', ordered: false, items: [[plain('Water, and more')]] }],
    ],
    [
      'a numbered item after bullets starts a new list',
      '- One\n1. Two',
      [
        { kind: 'list', ordered: false, items: [[plain('One')]] },
        { kind: 'list', ordered: true, items: [[plain('Two')]] },
      ],
    ],
    [
      'raw HTML stays the words that were typed',
      '<script>alert(1)</script>\n\n<p onclick="x">Hi</p>',
      [
        { kind: 'paragraph', runs: [plain('<script>alert(1)</script>')] },
        { kind: 'paragraph', runs: [plain('<p onclick="x">Hi</p>')] },
      ],
    ],
  ])('reads %s', (_name, text, blocks) => {
    expect(storyBlocks(text)).toEqual(blocks);
  });
});

// L2-069 AC10 (ADR 0097): emphasis, strong and https links only.
describe('storyRuns', () => {
  it.each([
    ['plain words', 'Keep moving', [plain('Keep moving')]],
    ['*emphasis*', 'Keep *moving* now', [plain('Keep '), em('moving'), plain(' now')]],
    ['**strong**', '**Stop** if dizzy', [strong('Stop'), plain(' if dizzy')]],
    [
      'strong inside emphasis',
      '*a **b** c*',
      [em('a '), { text: 'b', em: true, strong: true, href: null }, em(' c')],
    ],
    ['an unclosed mark stays a star', '5 * 3 = 15', [plain('5 * 3 = 15')]],
    ['an escaped star', '\\*not\\* emphasis', [plain('*not* emphasis')]],
    [
      'an https link',
      'See [Lena](https://example.org/lena) today',
      [plain('See '), link('Lena', 'https://example.org/lena'), plain(' today')],
    ],
    [
      'marks inside a link',
      '[**Book** now](https://example.org)',
      [
        { text: 'Book', em: false, strong: true, href: 'https://example.org' },
        link(' now', 'https://example.org'),
      ],
    ],
    ['an http link keeps only its words', '[Lena](http://example.org)', [plain('Lena')]],
    ['a javascript link keeps only its words', '[x](javascript:alert(1))', [plain('x)')]],
    ['a data link keeps only its words', '[x](data:text/html,hi)', [plain('x')]],
    ['a relative link keeps only its words', '[x](/events)', [plain('x')]],
    ['an address with a space is not a link', '[x](https://a.org b)', [plain('x')]],
    ['brackets that are not a link stay', '[draft] note', [plain('[draft] note')]],
  ])('reads %s', (_name, words, runs) => {
    expect(storyRuns(words)).toEqual(runs);
  });
});
