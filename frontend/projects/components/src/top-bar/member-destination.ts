/** The member app's six places, in the order both bars show them (top-bar.html, "Content"; L2-008 AC1). */
export type MemberDestinationKey =
  'home' | 'events' | 'directory' | 'services' | 'messages' | 'profile';

/**
 * One place of the member app's primary navigation: which place (its tab-bar icon), its one-word
 * label and where it goes. The top bar and the tab bar take the same list, so their labels match
 * word for word.
 */
export interface MemberDestination {
  key: MemberDestinationKey;
  label: string;
  href: string;
}
