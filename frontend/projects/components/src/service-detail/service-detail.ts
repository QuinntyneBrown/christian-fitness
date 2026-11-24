import { booleanAttribute, Component, input, output } from '@angular/core';
import { Alert } from '../alert/alert';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Card } from '../card/card';
import { DescriptionList, type DescriptionItem } from '../description-list/description-list';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The selected professional's card beside the Services list (mock `services/selected`, block
 * `service-detail`): a large avatar, the role as an eyebrow, the name as the card's heading, where
 * they work, the about text, a `spec-list` of credentials and rate, the verified line and the
 * contact actions: Request a booking and Message, or Contact alone when the listing publishes a
 * contact link (`hasContactLink`; L2-014; ADR 0053). It emits `requestBooking`, `startMessage` or `openContact` and holds no contact detail; while `busy` the action
 * ignores presses, and a `problem` shows as an alert above it. Sticky from LG. With `loading` it is the same card of `cf-skeleton`s. Every text is rendered as text.
 */
@Component({
  selector: 'cf-service-detail',
  imports: [Alert, Avatar, Button, Card, DescriptionList, Skeleton],
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
  /** The listing publishes a contact link, so the action is Contact, not Message. */
  readonly hasContactLink = input(false, { transform: booleanAttribute });
  /** The contact action is working on what was asked. */
  readonly busy = input(false, { transform: booleanAttribute });
  /** What went wrong with the contact action, in a sentence; empty when nothing did. */
  readonly problem = input('');
  readonly requestBooking = output();
  readonly startMessage = output();
  readonly openContact = output();

  protected facts(): readonly DescriptionItem[] {
    return [
      { term: 'Credentials', detail: this.credentials() },
      { term: 'Rate', detail: this.price() },
    ];
  }
}
