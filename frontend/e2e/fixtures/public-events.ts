import type { ApiHandlers } from './api-handlers';
import { BOOTCAMP, HOOPS_NIGHT, SUNRISE_5K, type EventSummary } from './events';

/** An event as `GET /api/public/events/upcoming` answers it: no price, capacity or going. */
export function landingEvent(event: EventSummary): Record<string, string> {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    startsAt: event.startsAt,
    place: event.place,
    area: event.area,
  };
}

export const NEXT_THREE = [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT].map(landingEvent);

/** The fourth: 9:30 AM on Wednesday, May 6, in Toronto. */
export const STRETCH_AND_PRAY = {
  id: '0190c0de-0000-7000-8000-00000000e0a4',
  title: 'Stretch & Pray: Mobility Morning',
  category: 'mobility',
  startsAt: '2026-05-06T13:30:00Z',
  place: 'Grace Fellowship Hall',
  area: 'Scarborough',
};

export const NEXT_FOUR = [...NEXT_THREE, STRETCH_AND_PRAY];

/** Answers the landing page's request with `events`, or with `status` when it is not 200. */
export function answerLanding(
  api: ApiHandlers,
  events: Record<string, string>[],
  status = 200,
): { asked: string[] } {
  const seen = { asked: [] as string[] };
  api.on('GET', '/api/public/events/upcoming', (request) => {
    seen.asked.push(new URL(request.url()).search);
    return status === 200
      ? { json: events }
      : { status, headers: { 'content-type': 'application/problem+json' }, json: { status } };
  });
  return seen;
}
