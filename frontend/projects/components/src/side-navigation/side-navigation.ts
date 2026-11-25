import { Component, input } from '@angular/core';
@Component({
  selector: 'cf-side-navigation',
  templateUrl: './side-navigation.html',
  styleUrl: './side-navigation.scss',
})
export class SideNavigation {
  readonly route = input.required<string>();
  readonly entries = input.required<readonly { id: string; title: string }[]>();
  readonly numbered = input(true);
}
