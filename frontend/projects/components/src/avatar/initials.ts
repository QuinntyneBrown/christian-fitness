/**
 * The initials an avatar shows for a name: the first letter of the first and the last word, in
 * capitals, at most two letters; none for a blank name.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (first.charAt(0) + last.charAt(0)).toLocaleUpperCase('en-CA');
}
