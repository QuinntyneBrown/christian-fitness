import { Component } from '@angular/core';
import { Button, Container, ErrorPage } from '@cf/components';

/**
 * The member app's not-found screen (mock docs/mocks/pages/not-found/), loaded by the wildcard
 * route: the heading, the reassurance and two ways back (L2-043 AC1, AC2).
 */
@Component({
  selector: 'cf-not-found-page',
  imports: [Button, Container, ErrorPage],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
})
export class NotFoundPage {}
