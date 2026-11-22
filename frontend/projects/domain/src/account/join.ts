import { INTERESTS, type InterestKey, type JoinRequestDto } from '@cf/api';

/** What the Join screen holds while the visitor types. */
export interface JoinForm {
  fullName: string;
  email: string;
  password: string;
  homeChurch: string;
  interests: readonly InterestKey[];
}

/**
 * The request the Join form sends (L2-003 AC1). A blank home church is sent as `null`, so the
 * account has none (L2-003 AC4, L2-033 AC1); the password goes exactly as typed. Client-side
 * validation is slice 2.2's.
 */
export function joinRequestOf(form: JoinForm): JoinRequestDto {
  const homeChurch = form.homeChurch.trim();
  return {
    fullName: form.fullName,
    email: form.email,
    password: form.password,
    homeChurch: homeChurch === '' ? null : homeChurch,
    interests: [...form.interests],
  };
}

/** Presses one interest toggle: adds or removes its key, keeping the order the form shows. */
export function toggleInterest(selected: readonly InterestKey[], key: InterestKey): InterestKey[] {
  const pressed = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
  return INTERESTS.map((interest) => interest.key).filter((k) => pressed.includes(k));
}

/** The Home stand-in's greeting: "Welcome, " and the first name, or "Welcome" (ADR 0007). */
export function welcomeOf(name: string | null): string {
  const first = name?.trim().split(/\s+/, 1)[0];
  return first ? `Welcome, ${first}` : 'Welcome';
}
