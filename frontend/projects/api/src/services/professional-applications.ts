import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** The kinds of professional Services lists, as the application's Category names them (L2-026). */
export const SERVICE_CATEGORIES = [
  'Training',
  'Nutrition',
  'Physio',
  'Coaching',
  'Counselling',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

/**
 * An application to be listed (`POST /api/professional-applications`, L2-026; ADR 0000): every value
 * trimmed and given. The credentials are plain text, never rendered as HTML.
 */
export interface SubmitApplicationDto {
  role: string;
  category: ServiceCategory;
  credentials: string;
  where: string;
  price: string;
  about: string;
}

/** The application as the API created it: the values, `pending`, and when it was sent. */
export interface ApplicationDto extends SubmitApplicationDto {
  id: string;
  status: 'pending';
  /** An ISO 8601 instant. */
  submittedAt: string;
}

/** Professional applications (ADR 0048). */
export interface ProfessionalApplicationsApi {
  /**
   * Sends the signed-in member's application and answers it as created (L2-026 AC1). A refusal or
   * no answer errors with an `ApiError`: 409 `application_pending` when one is still pending
   * (AC2), 403 `member_suspended`, 400 `field_too_long` or `validation_failed` for a value the API
   * refuses, status 0 for none.
   */
  submit(application: SubmitApplicationDto): Observable<ApplicationDto>;
}

/**
 * Binds {@link ProfessionalApplicationsApi}; the Services screen provides it on its own route
 * component, and the Apply to be listed dialog it opens uses the same one.
 */
export const PROFESSIONAL_APPLICATIONS_SERVICE = new InjectionToken<ProfessionalApplicationsApi>(
  'PROFESSIONAL_APPLICATIONS_SERVICE',
);
