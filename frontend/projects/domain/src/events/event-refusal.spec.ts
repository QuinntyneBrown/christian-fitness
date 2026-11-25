import type { ApiError } from '@cf/api';
import {
  capacityBelowGoingMessage,
  eventErrorHeading,
  eventErrorItems,
  eventFieldErrorsOf,
} from './event-refusal';

// L2-022 AC8: what a refused save says, field by field, in the mock's words and never the server's.
describe('eventFieldErrorsOf', () => {
  it.each([
    { key: 'title', code: 'title_required', field: 'title', text: 'Give the event a title' },
    {
      key: 'startTime',
      code: 'start_time_required',
      field: 'startTime',
      text: 'Pick a start time',
    },
    { key: 'date', code: 'start_in_past', field: 'date', text: 'Pick a start after now' },
    {
      key: 'priceCents',
      code: 'price_invalid',
      field: 'price',
      text: 'Use a price from $0 to $10,000',
    },
    {
      key: 'capacity',
      code: 'capacity_out_of_range',
      field: 'capacity',
      text: 'Use a capacity from 1 to 10,000',
    },
    {
      key: 'imageKey',
      code: 'image_invalid',
      field: 'image',
      text: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    {
      key: 'image',
      code: 'image_invalid',
      field: 'image',
      text: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    { key: 'hostListingId', code: 'host_required', field: 'host', text: 'Choose a Listed host' },
    {
      key: 'hostListingId',
      code: 'host_not_listed',
      field: 'host',
      text: 'Choose a Listed host',
    },
    { key: 'summary', code: 'a_code_not_known_yet', field: 'summary', text: 'Check this field' },
  ])('$key $code is $field "$text"', ({ key, code, field, text }) => {
    const error: ApiError = {
      status: 400,
      code: 'validation_failed',
      fieldCodes: { [key]: code },
    };

    expect(eventFieldErrorsOf(error, 0)).toEqual({ [field]: text });
  });

  it('gives every refused field its own message', () => {
    const error: ApiError = {
      status: 400,
      code: 'validation_failed',
      fieldCodes: { title: 'title_required', place: 'place_required' },
    };

    expect(eventFieldErrorsOf(error, 0)).toEqual({
      title: 'Give the event a title',
      place: 'Say where it happens',
    });
  });

  it('names the members going when the capacity is below them', () => {
    const error: ApiError = { status: 409, code: 'capacity_below_going' };

    expect(eventFieldErrorsOf(error, 36)).toEqual({
      capacity: '36 members are going. Set a capacity of at least 36',
    });
  });

  it.each([
    { why: 'no answer', error: { status: 0, code: 'network' } },
    { why: 'a server error', error: { status: 500, code: 'error' } },
    { why: 'not found', error: { status: 404, code: 'not_found' } },
    { why: 'a 400 without codes', error: { status: 400, code: 'validation_failed' } },
    {
      why: 'a 400 with codes for no field of the editor',
      error: { status: 400, code: 'validation_failed', fieldCodes: { nothing: 'x' } },
    },
  ])('is not a field refusal for $why', ({ error }) => {
    expect(eventFieldErrorsOf(error, 0)).toBeNull();
  });
});

describe('capacityBelowGoingMessage', () => {
  it.each([
    { going: 1, expected: '1 member is going. Set a capacity of at least 1' },
    { going: 2, expected: '2 members are going. Set a capacity of at least 2' },
  ])('says "$expected" for $going', ({ going, expected }) => {
    expect(capacityBelowGoingMessage(going)).toBe(expected);
  });
});

describe('the error summary', () => {
  it('lists the refused fields in the form order, each linking to its control', () => {
    expect(
      eventErrorItems({
        image: 'Bad image',
        host: 'No host',
        title: 'No title',
        capacity: 'No capacity',
      }),
    ).toEqual([
      { text: 'No title', target: 'f-title' },
      { text: 'No host', target: 'f-host' },
      { text: 'No capacity', target: 'f-capacity' },
      { text: 'Bad image', target: 'f-image' },
    ]);
  });

  it.each([
    { count: 1, expected: '1 thing to fix before saving' },
    { count: 2, expected: '2 things to fix before saving' },
  ])('heads $count as "$expected"', ({ count, expected }) => {
    expect(eventErrorHeading(count)).toBe(expected);
  });
});
