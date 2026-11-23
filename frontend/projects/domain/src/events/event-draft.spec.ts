import { capacityOf, eventDraftOf, EMPTY_EVENT_EDITOR, priceCentsOf } from './event-draft';

// ADR 0017: the event editor's typed price, in cents. Blank is free; what is not an amount of
// dollars and cents is sent as null for the API to refuse with price_invalid.
describe('priceCentsOf', () => {
  it.each([
    { why: 'blank is free', text: '', expected: 0 },
    { why: 'white space is free', text: '   ', expected: 0 },
    { why: 'whole dollars with a sign', text: '$340', expected: 34000 },
    { why: 'whole dollars without a sign', text: '10', expected: 1000 },
    { why: 'dollars and cents', text: '$12.50', expected: 1250 },
    { why: 'one decimal', text: '12.5', expected: 1250 },
    { why: 'a thousands comma', text: '$1,234.50', expected: 123450 },
    { why: 'spaces around', text: ' $45 ', expected: 4500 },
    { why: 'zero', text: '$0', expected: 0 },
    { why: 'free in words is not an amount', text: 'Free', expected: null },
    { why: 'three decimals', text: '12.345', expected: null },
    { why: 'a minus sign', text: '-5', expected: null },
    { why: 'two dots', text: '1.2.3', expected: null },
    { why: 'a misplaced comma', text: '12,34', expected: null },
    {
      why: 'too large to be a whole number of cents',
      text: '99999999999999999999',
      expected: null,
    },
  ])('$why ("$text") is $expected', ({ text, expected }) => {
    expect(priceCentsOf(text)).toBe(expected);
  });
});

// ADR 0017: the typed capacity; what is not a whole number is sent as null (capacity_required).
describe('capacityOf', () => {
  it.each([
    { why: 'a whole number', text: '60', expected: 60 },
    { why: 'spaces around', text: ' 60 ', expected: 60 },
    { why: 'zero, for the API to refuse as out of range', text: '0', expected: 0 },
    { why: 'blank', text: '', expected: null },
    { why: 'a decimal', text: '6.5', expected: null },
    { why: 'a minus sign', text: '-1', expected: null },
    { why: 'words', text: 'sixty', expected: null },
    { why: 'too large for the API', text: '99999999999', expected: null },
  ])('$why ("$text") is $expected', ({ text, expected }) => {
    expect(capacityOf(text)).toBe(expected);
  });
});

// L2-022 AC1: what Save draft sends for the editor's values.
describe('eventDraftOf', () => {
  it('sends the text as typed and the price and capacity as numbers', () => {
    expect(
      eventDraftOf({
        title: 'Whole Life Retreat',
        category: 'retreat',
        date: '2026-05-22',
        startTime: '16:00',
        place: 'Muskoka Woods, Rosseau',
        area: 'Muskoka Lakes',
        price: '$340',
        capacity: '60',
        summary: 'Meals and cabins included.',
      }),
    ).toEqual({
      title: 'Whole Life Retreat',
      category: 'retreat',
      date: '2026-05-22',
      startTime: '16:00',
      place: 'Muskoka Woods, Rosseau',
      area: 'Muskoka Lakes',
      priceCents: 34000,
      capacity: 60,
      summary: 'Meals and cabins included.',
    });
  });

  it('starts a new event on Run with every other field blank', () => {
    expect(EMPTY_EVENT_EDITOR).toEqual({
      title: '',
      category: 'run',
      date: '',
      startTime: '',
      place: '',
      area: '',
      price: '',
      capacity: '',
      summary: '',
    });
    expect(eventDraftOf(EMPTY_EVENT_EDITOR)).toEqual({
      title: '',
      category: 'run',
      date: '',
      startTime: '',
      place: '',
      area: '',
      priceCents: 0,
      capacity: null,
      summary: '',
    });
  });
});
