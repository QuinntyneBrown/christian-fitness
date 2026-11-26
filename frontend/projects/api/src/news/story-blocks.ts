/**
 * One run of a story's words with the same marks: plain, *emphasis*, **strong**, or inside an
 * `https` link (L2-069 AC10; ADR 0097). Made by the domain's one renderer, `storyBlocks`, and
 * shown by the components library's story as text, never as HTML.
 */
export interface StoryRun {
  text: string;
  em: boolean;
  strong: boolean;
  /** The `https` address the run links to, or none. */
  href: string | null;
}

/** One block of a story's text: a paragraph, a pull quote, a heading or a list. */
export type StoryBlock =
  | { kind: 'paragraph'; runs: StoryRun[] }
  | { kind: 'quote'; runs: StoryRun[] }
  | { kind: 'heading'; level: 2 | 3; runs: StoryRun[] }
  | { kind: 'list'; ordered: boolean; items: StoryRun[][] };
