/**
 * What the Cancel event confirmation tells staff (mock `dialogs/cancel-event/default`; ADR 0035):
 * it leaves the Events list, who sees it cancelled, and that it cannot be undone. `going` is how
 * many members are registered.
 */
export function cancelEventText(going: number): string {
  const leaves = 'It leaves the Events list for members.';
  const undone = "This can't be undone.";
  if (going === 0) return `${leaves} Nobody has registered. ${undone}`;
  const who = going === 1 ? 'The 1 member registered sees' : `The ${going} members registered see`;
  return `${leaves} ${who} it as cancelled on their Profile. ${undone}`;
}
