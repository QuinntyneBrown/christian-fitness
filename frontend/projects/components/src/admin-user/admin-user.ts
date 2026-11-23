import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The signed-in staff member at the foot of the admin sidebar (docs/design-system/components/
 * sidebar-navigation.html, `admin__user`): initials, name and role, and the Sign out icon button,
 * 44 × 44 px. Below LG only Sign out shows. Choosing it emits `signOut`; with `signingOut` it is
 * disabled and busy. `AdminLayout` places it; its own stylesheet keeps the layout's under budget.
 * Every text is rendered as text.
 */
@Component({
  selector: 'cf-admin-user',
  templateUrl: './admin-user.html',
  styleUrl: './admin-user.scss',
})
export class AdminUser {
  readonly name = input('');
  readonly role = input('');
  readonly initials = input('');
  readonly signingOut = input(false, { transform: booleanAttribute });

  readonly signOut = output();
}
