import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  input,
  numberAttribute,
  output,
  type TemplateRef,
} from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Skeleton } from '../skeleton/skeleton';

/**
 * How a column's cells read (table.html, "Code"): plain `text`, `muted` text, a `primary` name
 * with a muted second line, a `person` (the avatar's initials, the name and a muted second line,
 * as the Member column reads), tabular `num`bers, `nowrap` dates, a `count` out of a total (the
 * count strong, " / 200" muted, as the Registered column reads), or `custom` cells the screen
 * draws with its `cell` template (a status badge).
 */
export type TableCellKind =
  'text' | 'muted' | 'primary' | 'person' | 'num' | 'nowrap' | 'count' | 'custom';

export interface TableColumn {
  key: string;
  label: string;
  kind?: TableCellKind;
  /**
   * What a cell with no text means, such as "Not given": read by assistive technology beside an
   * em dash it skips. Without it an empty cell is blank. For `text`, `muted`, `num` and `nowrap`.
   */
  empty?: string;
}

/**
 * A cell's words: the text, a second line for a `primary` or `person` cell or under a `custom`
 * one (a note under a status badge), the total of a `count` cell.
 */
export interface TableCell {
  text: string;
  sub?: string;
  of?: string;
}

export interface TableRow {
  id: string;
  /** The row's name, added to its action for screen readers ("Edit Easter Sunrise 5K"). */
  name: string;
  cells: Record<string, TableCell | undefined>;
  /** The row action's address, when it is a link rather than a button. */
  actionHref?: string;
  /** A row the table's action does not apply to: its action cell stays empty. */
  noAction?: boolean;
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
  imports: [Avatar, NgTemplateOutlet, Skeleton],
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
  /** How many skeleton rows stand in for the rows while loading. */
  readonly loadingRows = input(3, { transform: numberAttribute });
  readonly cell = input<TemplateRef<TableCellContext>>();

  readonly action = output<string>();

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.loadingRows() }, (_, n) => n),
  );

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
      case 'count':
        return 'table__nowrap';
      case 'muted':
        return 'muted';
      default:
        return null;
    }
  }
}
