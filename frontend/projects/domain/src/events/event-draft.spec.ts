import {
  capacityOf,
  eventDraftOf,
  eventEditorValuesOf,
  EMPTY_EVENT_EDITOR,
  priceCentsOf,
  priceTextOf,
} from './event-draft';

// ADR 0021: the event editor's typed price, in cents. Blank is free; what is not an amount of
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

// ADR 0021: the typed capacity; what is not a whole number is sent as null (capacity_required).
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
        imageKey: null,
        imageName: null,
        hostListingId: 'h1',
        hostName: 'Lakeshore Runners Fellowship',
        suggestionArea: '',
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
      imageKey: null,
      hostListingId: 'h1',
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
      imageKey: null,
      imageName: null,
      hostListingId: null,
      hostName: '',
      suggestionArea: '',
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
      imageKey: null,
      hostListingId: null,
    });
  });
});

// ADR 0021, ADR 0025: a stored price shown the way staff type it, so a save sends it back unchanged.
describe('priceTextOf', () => {
  it.each([
    { why: 'free is blank', cents: 0, expected: '' },
    { why: 'whole dollars', cents: 34000, expected: '$340' },
    { why: 'dollars and cents', cents: 34050, expected: '$340.50' },
    { why: 'cents below a dollar', cents: 5, expected: '$0.05' },
    { why: 'a thousands comma', cents: 123450, expected: '$1,234.50' },
    { why: 'millions', cents: 100000000, expected: '$1,000,000' },
  ])('$why ($cents) is "$expected" and reads back as the same cents', ({ cents, expected }) => {
    expect(priceTextOf(cents)).toBe(expected);
    expect(priceCentsOf(priceTextOf(cents))).toBe(cents);
  });
});

// L2-022 AC7: the editor opens with every saved field.
describe('eventEditorValuesOf', () => {
  const saved = {
    id: 'e1',
    title: 'Whole Life Retreat',
    category: 'retreat' as const,
    date: '2026-05-22',
    startTime: '16:00',
    place: 'Muskoka Woods, Rosseau',
    area: 'Muskoka Lakes',
    priceCents: 34000,
    capacity: 60,
    summary: 'Meals and cabins included.',
    going: 36,
    status: 'draft' as const,
    host: { id: 'h4', kind: 'instructor' as const, name: 'Danielle Okafor' },
  };

  it('shows the saved fields as typed, with the price text and the capacity as text', () => {
    expect(eventEditorValuesOf(saved)).toEqual({
      title: 'Whole Life Retreat',
      category: 'retreat',
      date: '2026-05-22',
      startTime: '16:00',
      place: 'Muskoka Woods, Rosseau',
      area: 'Muskoka Lakes',
      price: '$340',
      capacity: '60',
      summary: 'Meals and cabins included.',
      imageKey: null,
      imageName: null,
      hostListingId: 'h4',
      hostName: 'Danielle Okafor',
      suggestionArea: '',
    });
  });

  it('keeps the stored image by its key and names it for the image field', () => {
    const key = '0123456789abcdef0123456789abcdef.jpg';

    expect(eventEditorValuesOf({ ...saved, imageKey: key })).toMatchObject({
      imageKey: key,
      imageName: 'Current image',
    });
  });
});

// L2-065 AC7 (ADR 0076, ADR 0115): the suggestion area is sent only when one is chosen; none is GTA-wide.
describe('the suggestion area', () => {
  it('is sent when chosen and left out for GTA-wide', () => {
    expect(
      eventDraftOf({ ...EMPTY_EVENT_EDITOR, suggestionArea: 'scarborough' }).suggestionArea,
    ).toBe('scarborough');
    expect('suggestionArea' in eventDraftOf(EMPTY_EVENT_EDITOR)).toBe(false);
  });

  it('opens with the saved area, or GTA-wide when the event has none', () => {
    const saved = {
      id: 'e1',
      title: 'Run',
      category: 'run' as const,
      date: '2026-05-22',
      startTime: '16:00',
      place: 'Park',
      area: 'Scarborough, Toronto',
      priceCents: 0,
      capacity: 10,
      summary: 'A run.',
      going: 0,
      status: 'draft' as const,
      host: { id: 'h4', kind: 'instructor' as const, name: 'Danielle Okafor' },
    };

    expect(eventEditorValuesOf({ ...saved, suggestionArea: 'durham' }).suggestionArea).toBe(
      'durham',
    );
    expect(eventEditorValuesOf(saved).suggestionArea).toBe('');
    expect(eventEditorValuesOf({ ...saved, suggestionArea: null }).suggestionArea).toBe('');
  });
});
