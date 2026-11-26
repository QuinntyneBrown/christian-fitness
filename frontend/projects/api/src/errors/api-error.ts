/**
 * A request the API refused or could not answer, as a service gives it to a screen (L2-032): the
 * HTTP status (0 when no answer arrived), the ProblemDetails `code` a screen branches on and, for
 * a refused body, the field errors. A screen shows its own generic message, never the server's.
 */
export interface ApiError {
  status: number;
  code: string;
  errors?: Record<string, string[]>;
  /** For a refused event: each failed field's own code, by the field's camel-case name (ADR 0021). */
  fieldCodes?: Record<string, string>;
  /** The account a refusal was about, such as the Google email no profile uses (ADR 0099). */
  account?: string;
  /** The numbers of the series dates an `event_full` refusal names (ADR 0102). */
  sessions?: number[];
}
