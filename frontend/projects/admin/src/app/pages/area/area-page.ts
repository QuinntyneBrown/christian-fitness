import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * An admin area's stand-in until its slice builds the screen (ADR 0011): the Dashboard (slice
 * 28.1), Events (10.1), Services (21.1) and Members (26.1) each show only their heading, read once
 * from the route's data, so every link of the navigation leads somewhere (L2-021 AC1).
 */
@Component({
  selector: 'cf-area-page',
  templateUrl: './area-page.html',
  styleUrl: './area-page.scss',
})
export class AreaPage {
  protected readonly heading = String(inject(ActivatedRoute).snapshot.data['heading'] ?? '');
}
