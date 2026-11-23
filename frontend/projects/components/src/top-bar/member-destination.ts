/** The member app's five places, in the order both bars show them (top-bar.html, "Content"). */
export type MemberDestinationKey = 'home' | 'events' | 'services' | 'messages' | 'profile';

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
