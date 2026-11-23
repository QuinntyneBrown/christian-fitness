import { Component, computed, input } from '@angular/core';
import { Avatar } from './avatar';

/** The most avatars a stack shows; its label carries the total. */
export const AVATAR_STACK_MAX = 5;

/**
 * The design system's avatar stack (docs/design-system/components/avatar.html, "Stack"):
 * overlapping small avatars of the first five `names`, then a real-text `label` naming the rest
 * ("Michael, Danielle and 140 others"), so the count is read.
 */
@Component({
  selector: 'cf-avatar-stack',
  imports: [Avatar],
  templateUrl: './avatar-stack.html',
  styleUrl: './avatar-stack.scss',
})
export class AvatarStack {
  readonly names = input.required<readonly string[]>();
  readonly label = input.required<string>();

  protected readonly shown = computed(() => this.names().slice(0, AVATAR_STACK_MAX));
}
