import { isEventFull } from './event-full';

// ADR 0033: only the full-event refusal turns the page to "This event is full".
describe('isEventFull', () => {
  it.each([
    { error: { status: 409, error: { code: 'event_full' } }, full: true },
    { error: { status: 409, error: { code: 'other' } }, full: false },
    { error: { status: 403, error: { code: 'event_full' } }, full: false },
    { error: { status: 409, error: null }, full: false },
    { error: { status: 409 }, full: false },
    { error: new Error('offline'), full: false },
    { error: null, full: false },
    { error: 'event_full', full: false },
  ])('reads $error as full $full', ({ error, full }) => {
    expect(isEventFull(error)).toBe(full);
  });
});
