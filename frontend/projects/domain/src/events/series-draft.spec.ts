import type { AdminSeriesDto, ApiError } from '@cf/api';
import {
  capacityBelowJoinedMessage,
  dropInPriceCentsOf,
  EMPTY_SERIES_EDITOR,
  seriesDraftOf,
  seriesDraftProblemsOf,
  type SeriesEditorValues,
  seriesEditorValuesOf,
  seriesErrorItems,
  seriesFieldErrorsOf,
  seriesPriceCentsOf,
  seriesPriceTextOf,
} from './series-draft';

/** Sunday Stretch & Prayer as the series editor mock fills it, hosted by the team listing. */
const STRETCH: SeriesEditorValues = {
  ...EMPTY_SERIES_EDITOR,
  title: 'Sunday Stretch & Prayer',
  category: 'mobility',
  hostListingId: 'team',
  hostName: 'Christian Fitness',
  description: 'Forty minutes of gentle stretching and mobility, then prayer.',
  seriesPrice: 'Free',
  dropInPrice: 'Free',
  capacity: '25',
  location: 'St. Lawrence Community Rec Centre',
  area: 'Downtown, Toronto',
};

// ADR 0091: the series price is free when blank or "Free"; the drop-in is none when blank.
describe('series prices', () => {
  it.each([
    { text: '', series: 0, dropIn: null },
    { text: '  ', series: 0, dropIn: null },
    { text: 'Free', series: 0, dropIn: 0 },
    { text: 'free', series: 0, dropIn: 0 },
    { text: '$64', series: 6400, dropIn: 6400 },
    { text: '10.50', series: 1050, dropIn: 1050 },
    { text: '$1,000', series: 100000, dropIn: 100000 },
    { text: 'ten', series: null, dropIn: undefined },
    { text: '-5', series: null, dropIn: undefined },
  ])('"$text" is $series for the series and $dropIn for a drop-in', ({ text, series, dropIn }) => {
    expect(seriesPriceCentsOf(text)).toBe(series);
    expect(dropInPriceCentsOf(text)).toBe(dropIn);
  });
});

describe('seriesDraftOf', () => {
  it('sends the text as typed and the prices and capacity as numbers', () => {
    expect(seriesDraftOf({ ...STRETCH, seriesPrice: '$64', dropInPrice: '' })).toEqual({
      title: 'Sunday Stretch & Prayer',
      category: 'mobility',
      summary: 'Forty minutes of gentle stretching and mobility, then prayer.',
      imageKey: null,
      hostListingId: 'team',
      priceCents: 6400,
      dropInPriceCents: null,
      capacity: 25,
      place: 'St. Lawrence Community Rec Centre',
      area: 'Downtown, Toronto',
    });
  });
});

// L2-071 AC15 (mock series-editor/invalid): what the editor names before it sends.
describe('seriesDraftProblemsOf', () => {
  it.each<{ why: string; change: Partial<SeriesEditorValues>; problems: object }>([
    { why: 'a filled editor', change: {}, problems: {} },
    {
      why: 'a blank title',
      change: { title: '  ' },
      problems: { title: 'Give the series a title members will recognize' },
    },
    {
      why: 'no host chosen',
      change: { hostListingId: null, hostName: 'Lake' },
      problems: { host: 'Choose a Listed host' },
    },
    {
      why: 'a capacity of 0',
      change: { capacity: '0' },
      problems: { capacity: 'Set a capacity of at least 1' },
    },
    {
      why: 'a blank capacity',
      change: { capacity: '' },
      problems: { capacity: 'Set a capacity of at least 1' },
    },
    {
      why: 'a capacity that is not a whole number',
      change: { capacity: '2.5' },
      problems: { capacity: 'Set a capacity of at least 1' },
    },
    { why: 'a capacity of 1', change: { capacity: '1' }, problems: {} },
    {
      why: 'a series price that is not an amount',
      change: { seriesPrice: 'ten' },
      problems: { seriesPrice: 'Use a price from $0 to $10,000' },
    },
    {
      why: 'a drop-in price that is not an amount',
      change: { dropInPrice: 'ten' },
      problems: { dropInPrice: 'Use a price from $0 to $10,000' },
    },
    { why: 'no drop-in', change: { dropInPrice: '' }, problems: {} },
  ])('$why', ({ change, problems }) => {
    expect(seriesDraftProblemsOf({ ...STRETCH, ...change })).toEqual(problems);
  });
});

describe('seriesFieldErrorsOf', () => {
  const refused = (fieldCodes: Record<string, string>): ApiError => ({
    status: 400,
    code: 'validation_failed',
    fieldCodes,
  });

  it.each([
    {
      key: 'title',
      code: 'title_required',
      field: 'title',
      text: 'Give the series a title members will recognize',
    },
    { key: 'hostListingId', code: 'host_not_listed', field: 'host', text: 'Choose a Listed host' },
    {
      key: 'summary',
      code: 'summary_too_long',
      field: 'description',
      text: 'Use 1,000 characters or fewer',
    },
    {
      key: 'imageKey',
      code: 'image_invalid',
      field: 'image',
      text: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    {
      key: 'priceCents',
      code: 'price_invalid',
      field: 'seriesPrice',
      text: 'Use a price from $0 to $10,000',
    },
    {
      key: 'dropInPriceCents',
      code: 'price_invalid',
      field: 'dropInPrice',
      text: 'Use a price from $0 to $10,000',
    },
    {
      key: 'capacity',
      code: 'capacity_out_of_range',
      field: 'capacity',
      text: 'Use a capacity from 1 to 10,000',
    },
    { key: 'place', code: 'place_required', field: 'location', text: 'Say where it happens' },
    { key: 'area', code: 'area_too_long', field: 'area', text: 'Use 100 characters or fewer' },
    { key: 'category', code: 'something_new', field: 'category', text: 'Check this field' },
  ])('$key $code is $field: "$text"', ({ key, code, field, text }) => {
    expect(seriesFieldErrorsOf(refused({ [key]: code }))).toEqual({ [field]: text });
  });

  it('is null for a failure that names no field', () => {
    expect(seriesFieldErrorsOf({ status: 500, code: 'internal_error' })).toBeNull();
    expect(seriesFieldErrorsOf(refused({ unknownKey: 'title_required' }))).toBeNull();
  });
});

describe('seriesErrorItems', () => {
  it('lists the fields in the form order, each linked to its control', () => {
    expect(
      seriesErrorItems({ capacity: 'c', title: 't', host: 'h', location: 'l', dropInPrice: 'd' }),
    ).toEqual([
      { text: 't', target: 'f-title' },
      { text: 'h', target: 'f-host' },
      { text: 'd', target: 'f-drop-in-price' },
      { text: 'c', target: 'f-capacity' },
      { text: 'l', target: 'f-place' },
    ]);
  });
});

// L2-071 AC13 (mock series-editor/edit): a saved series opens with its values.
describe('seriesEditorValuesOf', () => {
  const couch = {
    id: 'c5',
    title: 'Couch to 5K Run Club',
    category: 'run',
    summary: 'Eight weeks from walking to running a full 5K.',
    imageKey: 'abc.jpg',
    host: { id: 'lakeshore', kind: 'organization', name: 'Lakeshore Runners Fellowship' },
    place: 'Humber Bay Park East',
    area: 'Etobicoke, Toronto',
    priceCents: 6400,
    dropInPriceCents: 1000,
    capacity: 40,
  } as AdminSeriesDto;

  it('opens with the saved text, host, prices as typed and the image kept', () => {
    expect(seriesEditorValuesOf(couch)).toEqual({
      title: 'Couch to 5K Run Club',
      category: 'run',
      hostListingId: 'lakeshore',
      hostName: 'Lakeshore Runners Fellowship',
      description: 'Eight weeks from walking to running a full 5K.',
      imageKey: 'abc.jpg',
      imageName: 'Current image',
      seriesPrice: '$64',
      dropInPrice: '$10',
      capacity: '40',
      location: 'Humber Bay Park East',
      area: 'Etobicoke, Toronto',
    });
  });

  it.each([
    { cents: 0, text: 'Free' },
    { cents: 6400, text: '$64' },
    { cents: 1050, text: '$10.50' },
    { cents: null, text: '' },
  ])('a price of $cents reads "$text"', ({ cents, text }) => {
    expect(seriesPriceTextOf(cents)).toBe(text);
  });
});

// L2-071 AC13 (mock series-editor/edit-invalid): a capacity below the members who joined.
describe('a capacity below the joined', () => {
  it.each([
    {
      capacity: '20',
      joined: 31,
      problem: '31 members have joined. Set a capacity of at least 31',
    },
    {
      capacity: '30',
      joined: 31,
      problem: '31 members have joined. Set a capacity of at least 31',
    },
    { capacity: '31', joined: 31, problem: undefined },
    { capacity: '0', joined: 31, problem: 'Set a capacity of at least 1' },
  ])('$capacity with $joined joined: $problem', ({ capacity, joined, problem }) => {
    expect(seriesDraftProblemsOf({ ...STRETCH, capacity }, joined).capacity).toBe(problem);
  });

  it('words one member as one', () => {
    expect(capacityBelowJoinedMessage(1)).toBe('1 member has joined. Set a capacity of at least 1');
  });

  it('names the refusal capacity_below_joined with the joined the editor opened with', () => {
    expect(seriesFieldErrorsOf({ status: 409, code: 'capacity_below_joined' }, 31)).toEqual({
      capacity: '31 members have joined. Set a capacity of at least 31',
    });
  });
});
