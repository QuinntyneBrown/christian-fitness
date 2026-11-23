import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, type TemplateRef } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * How a column's cells read (table.html, "Code"): plain `text`, a `primary` name with a muted
 * second line, tabular `num`bers, `nowrap` dates and counts, or `custom` cells the screen draws
 * with its `cell` template (a status badge, a person with an avatar).
 */
export type TableCellKind = 'text' | 'primary' | 'num' | 'nowrap' | 'custom';

export interface TableColumn {
  key: string;
  label: string;
  kind?: TableCellKind;
}

/** A cell's words: the text, and a second line for a `primary` cell. */
export interface TableCell {
  text: string;
  sub?: string;
}

export interface TableRow {
  id: string;
  /** The row's name, added to its action for screen readers ("Edit Easter Sunrise 5K"). */
  name: string;
  cells: Record<string, TableCell | undefined>;
  /** The row action's address, when it is a link rather than a button. */
  actionHref?: string;
}

/** What a `custom` cell template receives. */
export interface TableCellContext {
  $implicit: TableRow;
  column: TableColumn;
}

/** The density of the minimum width (table.html, "Sizes"). */
export type TableWidth = 'standard' | 'wide' | 'wider';

/**
 * The design system's table (docs/design-system/components/table.html): a native data table for
 * the admin console, with a `<caption>` (visually hidden when the page heading names it) and
 * `<th scope="col">` headers, in a surface wrapper that scrolls sideways below its minimum width
 * and is a labelled, focusable region so keyboard users can scroll it. Cells are not focusable;
 * the row action is, named after its row, and emits `action` with the row's id (or follows its
 * `actionHref`). While `loading` it keeps the header and draws skeleton rows under `aria-busy`.
 * Empty and failed tables are swapped for an empty state or an inline message by the screen. Words
 * are rendered as text.
 */
@Component({
  selector: 'cf-table',
  imports: [NgTemplateOutlet, Skeleton],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  readonly caption = input.required<string>();
  readonly captionHidden = input(true);
  readonly columns = input.required<readonly TableColumn[]>();
  readonly rows = input.required<readonly TableRow[]>();
  /** The row action's label, such as "Edit"; none means no action column. */
  readonly actionLabel = input<string>();
  readonly width = input<TableWidth>('standard');
  readonly loading = input(false);
  readonly cell = input<TemplateRef<TableCellContext>>();

  readonly action = output<string>();

  protected readonly skeletonRows = [0, 1, 2];

  protected tableClasses(): string {
    const width = this.width();
    return width === 'standard' ? 'table' : `table table--${width}`;
  }

  protected captionClass(): string {
    return this.captionHidden() ? 'visually-hidden' : 'table__caption';
  }

  protected cellClass(column: TableColumn): string | null {
    switch (column.kind) {
      case 'num':
        return 'table__num table__nowrap';
      case 'nowrap':
        return 'table__nowrap';
      default:
        return null;
    }
  }
}
