/**
 * A request the API refused or could not answer, as a service gives it to a screen (L2-032): the
 * HTTP status (0 when no answer arrived), the ProblemDetails `code` a screen branches on and, for
 * a refused body, the field errors. A screen shows its own generic message, never the server's.
 */
export interface ApiError {
  status: number;
  code: string;
  errors?: Record<string, string[]>;
}
