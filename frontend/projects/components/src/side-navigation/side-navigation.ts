import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
@Component({
  selector: 'cf-side-navigation',
  templateUrl: './side-navigation.html',
  styleUrl: './side-navigation.scss',
})
export class SideNavigation {
  readonly route = input.required<string>();
  readonly entries = input.required<readonly { id: string; title: string }[]>();
  readonly numbered = input(true);
  readonly navigate = output<string>();
  protected follow(event: MouseEvent, id: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.route() + '#' + id);
  }
}
