import {
  bookingFirstName,
  bookingRefusalOf,
  bookingRequestOf,
  bookingSummaryOf,
  clearBookingError,
  emptyBookingForm,
  validateBooking,
} from './booking-request';

// L2-014 AC3: the same table as the API's RequestBookingValidator, one case per row.
describe('validateBooking', () => {
  it.each<{ why: string; when: string; message: string; expected: Record<string, string> }>([
    { why: 'valid', when: 'Saturdays', message: '', expected: {} },
    {
      why: 'when blank',
      when: '  ',
      message: '',
      expected: { when: 'Tell Danielle which days and times work for you' },
    },
    { why: 'when 200', when: 'w'.repeat(200), message: '', expected: {} },
    {
      why: 'when 201',
      when: 'w'.repeat(201),
      message: '',
      expected: { when: 'Use 200 characters or fewer' },
    },
    { why: 'when 200 once trimmed', when: ` ${'w'.repeat(200)} `, message: '', expected: {} },
    { why: 'message 1000', when: 'x', message: 'm'.repeat(1000), expected: {} },
    {
      why: 'message 1001',
      when: 'x',
      message: 'm'.repeat(1001),
      expected: { message: 'Keep your message to 1,000 characters' },
    },
  ])('$why', ({ when, message, expected }) => {
    expect(validateBooking({ ...emptyBookingForm(), when, message }, 'Danielle Okafor')).toEqual(
      expected,
    );
  });
});

describe('bookingFirstName', () => {
  it.each([
    ['Danielle Okafor', 'Danielle'],
    ['Marcus Lee, RD', 'Marcus'],
    ['Rev. James Whitfield', 'James'],
    ['Dr.', 'Dr.'],
    ['', 'the professional'],
  ])('%s is %s', (name, expected) => {
    expect(bookingFirstName(name)).toBe(expected);
  });
});

describe('bookingRequestOf', () => {
  it('trims the values and leaves out a blank message', () => {
    expect(bookingRequestOf({ kind: 'one-on-one', when: ' Mondays ', message: '  ' })).toEqual({
      kind: 'one-on-one',
      when: 'Mondays',
    });
    expect(bookingRequestOf({ kind: 'intro-call', when: 'x', message: ' Hi ' })).toEqual({
      kind: 'intro-call',
      when: 'x',
      message: 'Hi',
    });
  });
});

describe('bookingSummaryOf and clearBookingError', () => {
  it('headlines the missing time and links each line to its control', () => {
    expect(bookingSummaryOf({ when: 'a', message: 'b' })).toEqual({
      heading: "Add when you're free",
      items: [
        { text: 'a', target: 'f-when' },
        { text: 'b', target: 'f-message' },
      ],
    });
    expect(bookingSummaryOf({ message: 'b' }).heading).toBe('Check your message');
  });

  it('clears only the edited field', () => {
    expect(clearBookingError({ when: 'a', message: 'b' }, 'when')).toEqual({ message: 'b' });
  });
});

describe('bookingRefusalOf', () => {
  it.each([
    [{ status: 403, code: 'recipient_unavailable' }, 'unavailable'],
    [{ status: 409, code: 'professional_not_linked' }, 'failed'],
    [{ status: 0 }, 'failed'],
    ['nope', 'failed'],
  ])('%j is %s', (error, expected) => {
    expect(bookingRefusalOf(error)).toBe(expected);
  });
});
