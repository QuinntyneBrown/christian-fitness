/** How long a counted story is not counted again in one browser (L2-061 AC12): 24 hours. */
export const STORY_READ_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a read of the story whose hashed id is `key` counts at `now`, and the log to keep after
 * it (L2-061 AC12; ADR 0105). The log maps each hashed id to when it was counted; ids counted 24
 * hours ago or more are dropped, so it holds at most the stories read in a day. Anything stored
 * that is not such a log is read as an empty one.
 */
export function storyReadLog(
  stored: string | null,
  key: string,
  now: number,
): { counts: boolean; next: string } {
  const recent: Record<string, number> = {};
  for (const [id, at] of Object.entries(parsed(stored))) {
    if (typeof at === 'number' && now - at < STORY_READ_WINDOW_MS) recent[id] = at;
  }
  const counts = !(key in recent);
  if (counts) recent[key] = now;
  return { counts, next: JSON.stringify(recent) };
}

function parsed(stored: string | null): Record<string, unknown> {
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
