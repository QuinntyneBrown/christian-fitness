import { Component, input } from '@angular/core';

/** A page's block padding: none, the list page's (`page`) or the detail page's (`page--detail`). */
export type ContainerPage = 'none' | 'default' | 'detail';

/**
 * The design system's container (docs/design-system/components/layout.html, "Container"): centres
 * its content at `--layout-container-max` with 16 px, then from 640 px 24 px, side margins. With
 * `page` it also pads the page above and below (32 px, 40 px from LG; a detail page 24 px, 32 px).
 * It carries no colour and no landmark: the screen puts `main` or `aside` on its own elements.
 */
@Component({
  selector: 'cf-container',
  templateUrl: './container.html',
  styleUrl: './container.scss',
})
export class Container {
  readonly page = input<ContainerPage>('none');

  protected classes(): string {
    switch (this.page()) {
      case 'default':
        return 'container page';
      case 'detail':
        return 'container page page--detail';
      default:
        return 'container';
    }
  }
}
