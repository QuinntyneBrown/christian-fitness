/** The longest reason a decline keeps, counted once trimmed (L2-025 AC3; ADR 0049). */
export const DECLINE_REASON_MAX = 500;

/** Why a decision did not go through: someone decided it first, or it simply failed. */
export type DecisionRefusal = 'decided' | 'failed';

/** What the decline dialog tells staff about the reason, or null when it is fine. */
export function declineReasonProblem(reason: string): string | null {
  const length = reason.trim().length;
  if (length === 0) return 'Write a reason for declining';
  if (length > DECLINE_REASON_MAX) return 'Use 500 characters or fewer';
  return null;
}

/**
 * Each refusal is its status and its code together (ADR 0049): the application is decided or no
 * longer there, which staff meet the same way. Anything else is a failure.
 */
export function decisionRefusalOf(error: unknown): DecisionRefusal {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 409 && code === 'application_decided') return 'decided';
  if (status === 404 && code === 'application_not_found') return 'decided';
  return 'failed';
}

/** The alert above the list when an approval did not go through (mock `admin-services/failed`). */
export function approvalFailure(
  refusal: DecisionRefusal,
  name: string,
): { heading: string; text: string } {
  return refusal === 'decided'
    ? {
        heading: 'This application was already decided',
        text: 'Someone else approved or declined it. The list shows where things stand now.',
      }
    : {
        heading: `Couldn't approve ${name}`,
        text: "The server didn't respond. Nothing changed; try again.",
      };
}

/** The alert in the decline dialog when it did not go through (mocks `decline-application/failed`, `refused`). */
export function declineFailure(refusal: DecisionRefusal): { heading: string; text: string } {
  return refusal === 'decided'
    ? {
        heading: 'This application was already decided',
        text: 'Someone else approved or declined it. Close this to see the queue as it is now.',
      }
    : {
        heading: "Couldn't decline the application",
        text: "The server didn't respond. Nothing was lost; try again.",
      };
}
