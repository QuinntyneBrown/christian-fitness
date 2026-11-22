/**
 * The initials an avatar shows for a name, as the mocks draw them ("Dana Reyes" is "DR"): the
 * first letter of the first word and of the last, in upper case; one letter for a one-word name
 * and none for a blank one. Letters outside the basic Latin range count as letters.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (first + last).toLocaleUpperCase();
}
