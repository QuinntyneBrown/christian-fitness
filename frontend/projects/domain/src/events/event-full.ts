/**
 * Whether a failed registration was refused because the event is full (L2-011 AC2, AC3; ADR 0033):
 * a 409 whose body carries the code `event_full`. Any other failure is not.
 */
export function isEventFull(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { status, error: body } = error as { status?: unknown; error?: unknown };
  return (
    status === 409 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === 'event_full'
  );
}
