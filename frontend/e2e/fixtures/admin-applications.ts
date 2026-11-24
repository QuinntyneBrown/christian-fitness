/** One pending application as `GET /api/admin/services/applications` answers it (ADR 0048). */
export interface PendingApplicationFixture {
  id: string;
  name: string;
  role: string;
  credentials: string;
  submittedAt: string;
}

/** The queue the fixture answers unless a spec says otherwise: nothing waiting (mock `no-applications`). */
export const NO_APPLICATIONS = { total: 0, applications: [] };

/** The mocks' today, pinned for specs that show "2 days ago": Wednesday, April 15, 2026, 8:45 AM in Toronto. */
export const APPLICATIONS_NOW = new Date('2026-04-15T12:45:00Z');

/** The mock `admin-services/default` cast, oldest first. */
export const CAST_APPLICATIONS: PendingApplicationFixture[] = [
  {
    id: '5b1e0c8e-0000-4000-8000-000000000001',
    name: 'Lena Park, RD',
    role: 'Sports dietitian',
    credentials: 'Registered Dietitian, CDO',
    submittedAt: '2026-04-10T12:45:00Z',
  },
  {
    id: '5b1e0c8e-0000-4000-8000-000000000002',
    name: 'Samuel Osei',
    role: 'Strength coach',
    credentials: 'CSCS · 6 years',
    submittedAt: '2026-04-12T12:45:00Z',
  },
  {
    id: '5b1e0c8e-0000-4000-8000-000000000003',
    name: 'Hannah Bergstrom',
    role: 'Registered massage therapist',
    credentials: 'RMT, CMTO #T4471',
    submittedAt: '2026-04-13T12:45:00Z',
  },
];

/** The answer for `applications`; `total` is how many wait in all (more than are listed when capped). */
export function applicationQueue(
  applications: PendingApplicationFixture[],
  total = applications.length,
): { json: { total: number; applications: PendingApplicationFixture[] } } {
  return { json: { total, applications } };
}
