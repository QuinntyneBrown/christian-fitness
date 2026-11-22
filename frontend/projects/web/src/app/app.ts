import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The member app's shell: the routed screens render in its outlet. */
@Component({
  selector: 'cf-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
