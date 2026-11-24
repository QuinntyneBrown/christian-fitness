import { booleanAttribute, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Card } from '../card/card';
import { DescriptionList, type DescriptionItem } from '../description-list/description-list';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The selected professional's card beside the Services list (mock `services/selected`, block
 * `service-detail`): a large avatar, the role as an eyebrow, the name as the card's heading, where
 * they work, the about text, a `spec-list` of credentials and rate, and the verified line. Sticky
 * from LG. With `loading` it is the same card of `cf-skeleton`s. Every text is rendered as text.
 */
@Component({
  selector: 'cf-service-detail',
  imports: [Avatar, Card, DescriptionList, Skeleton],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.scss',
})
export class ServiceDetail {
  readonly name = input('');
  readonly role = input('');
  readonly where = input('');
  readonly about = input('');
  readonly credentials = input('');
  readonly price = input('');
  /** The verified line, such as "Verified by Christian Fitness, March 2026". */
  readonly verified = input('');
  readonly loading = input(false, { transform: booleanAttribute });

  protected facts(): readonly DescriptionItem[] {
    return [
      { term: 'Credentials', detail: this.credentials() },
      { term: 'Rate', detail: this.price() },
    ];
  }
}
