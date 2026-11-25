import { Component, input } from '@angular/core';
import { Link } from '../link/link';

export interface ProseSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
}
@Component({
  selector: 'cf-prose',
  imports: [Link],
  templateUrl: './prose.html',
  styleUrl: './prose.scss',
})
export class Prose {
  readonly title = input.required<string>();
  readonly effective = input.required<string>();
  readonly points = input.required<readonly string[]>();
  readonly sections = input.required<readonly ProseSection[]>();
}
