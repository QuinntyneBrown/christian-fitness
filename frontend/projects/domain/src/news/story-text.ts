import type { StoryBlock, StoryRun } from '@cf/api';

const HEADING = /^(#{2,3})(?: +(.*))?$/;
const BULLET = /^[-*] +(.*)$/;
const NUMBERED = /^\d{1,9}\. +(.*)$/;
const QUOTE = /^> ?(.*)$/;
const ESCAPABLE = '\\*[]()_#>-';

/**
 * The one sanitising renderer of a story's text (L2-069 AC10; ADR 0097), shared by Preview and the
 * story page: the small Markdown subset of paragraphs, `>` quotes (a pull quote), `##` and `###`
 * headings, bulleted (`-` or `*`) and numbered (`1.`) lists, `[words](https://…)` links,
 * `*emphasis*` and `**strong**`. Blocks are separated by a blank line; a list or a heading also
 * ends a paragraph. It answers blocks of text runs, never HTML, so raw HTML stays as the words that
 * were typed; a link to anything but an `https` address keeps its words and drops the address.
 */
export function storyBlocks(text: string): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const endParagraph = () => {
    if (paragraph.length === 0) return;
    const quoted = QUOTE.test(paragraph[0]);
    const words = paragraph
      .map((line) => (quoted ? line.replace(QUOTE, '$1') : line).trim())
      .filter(Boolean)
      .join(' ');
    if (words) blocks.push({ kind: quoted ? 'quote' : 'paragraph', runs: storyRuns(words) });
    paragraph = [];
  };
  const endList = () => {
    if (list)
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items.map(storyRuns) });
    list = null;
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = HEADING.exec(line);
    const item = BULLET.exec(line) ?? NUMBERED.exec(line);
    if (!line) {
      endParagraph();
      endList();
    } else if (heading) {
      endParagraph();
      endList();
      const words = (heading[2] ?? '').trim();
      if (words) {
        blocks.push({ kind: 'heading', level: heading[1].length as 2 | 3, runs: storyRuns(words) });
      }
    } else if (item) {
      endParagraph();
      const ordered = !BULLET.test(line);
      if (list && list.ordered !== ordered) endList();
      list ??= { ordered, items: [] };
      list.items.push(item[1].trim());
    } else if (list) {
      // A line under a list item carries on that item.
      list.items[list.items.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  endParagraph();
  endList();
  return blocks;
}

/** The runs of one block's words: emphasis, strong and `https` links, with `\` escaping a mark. */
export function storyRuns(words: string): StoryRun[] {
  const runs: StoryRun[] = [];
  parse(words, { em: false, strong: false, href: null }, runs);
  return runs;
}

type Marks = Omit<StoryRun, 'text'>;

function parse(source: string, marks: Marks, runs: StoryRun[]): void {
  let text = '';
  const flush = () => {
    if (text) push(runs, { text, ...marks });
    text = '';
  };
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '\\' && i + 1 < source.length && ESCAPABLE.includes(source[i + 1])) {
      text += source[i + 1];
      i += 2;
      continue;
    }
    if (source.startsWith('**', i) && !marks.strong) {
      const close = closing(source, '**', i + 2);
      if (close > i + 2) {
        flush();
        parse(source.slice(i + 2, close), { ...marks, strong: true }, runs);
        i = close + 2;
        continue;
      }
    }
    if (c === '*' && source[i + 1] !== '*' && !marks.em) {
      const close = closing(source, '*', i + 1);
      if (close > i + 1) {
        flush();
        parse(source.slice(i + 1, close), { ...marks, em: true }, runs);
        i = close + 1;
        continue;
      }
    }
    if (c === '[' && marks.href === null) {
      const link = linkAt(source, i);
      if (link) {
        flush();
        parse(link.words, { ...marks, href: isHttps(link.address) ? link.address : null }, runs);
        i = link.end;
        continue;
      }
    }
    text += c;
    i += 1;
  }
  flush();
}

/** Where `mark` closes after `from`, skipping escapes and, for `*`, the `**` of strong; -1 if never. */
function closing(source: string, mark: '*' | '**', from: number): number {
  for (let j = from; j < source.length; j++) {
    if (source[j] === '\\') {
      j++;
      continue;
    }
    if (mark === '**' && source.startsWith('**', j)) return j;
    if (mark === '*' && source[j] === '*') {
      if (source[j + 1] === '*') {
        j++;
        continue;
      }
      return j;
    }
  }
  return -1;
}

/** `[words](address)` at `at`: its words, address and the index after it; none if not a link. */
function linkAt(
  source: string,
  at: number,
): { words: string; address: string; end: number } | null {
  const close = source.indexOf('](', at + 1);
  if (close < 0) return null;
  const end = source.indexOf(')', close + 2);
  if (end < 0) return null;
  const words = source.slice(at + 1, close);
  const address = source.slice(close + 2, end).trim();
  if (!words || words.includes('[')) return null;
  return { words, address, end: end + 1 };
}

/** Only a whole `https` address with a host is a link (L2-069 AC10). */
function isHttps(address: string): boolean {
  if (/\s/.test(address)) return false;
  try {
    const url = new URL(address);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

function push(runs: StoryRun[], run: StoryRun): void {
  const last = runs[runs.length - 1];
  if (last && last.em === run.em && last.strong === run.strong && last.href === run.href) {
    last.text += run.text;
  } else {
    runs.push(run);
  }
}
