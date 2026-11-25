import type { AdminSeriesDto, ApiError, EventCategory, SeriesDraftDto } from '@cf/api';
import { capacityOf, KEPT_IMAGE_NAME, priceCentsOf, priceTextOf } from './event-draft';

/** What the series editor's fields hold, as typed (mock `series-editor`). */
export interface SeriesEditorValues {
  title: string;
  category: EventCategory;
  /** The chosen host's listing, or none while nothing is chosen (ADR 0089). */
  hostListingId: string | null;
  /** What the Host field shows: the chosen host's name, or what is being searched. */
  hostName: string;
  description: string;
  /** The stored image's key, or none (ADR 0025). */
  imageKey: string | null;
  /** What the image field shows: the chosen file's name, or none. */
  imageName: string | null;
  /** The series price as typed: blank or "Free" is free, "$64" is 6400 cents. */
  seriesPrice: string;
  /** The drop-in price as typed: blank is no drop-in, "Free" is a free drop-in. */
  dropInPrice: string;
  capacity: string;
  location: string;
  /** The suggestion area: where members are told about it, neighbourhood and city. */
  area: string;
}

/** A new series: the first category, every other field blank. */
export const EMPTY_SERIES_EDITOR: SeriesEditorValues = {
  title: '',
  category: 'run',
  hostListingId: null,
  hostName: '',
  description: '',
  imageKey: null,
  imageName: null,
  seriesPrice: '',
  dropInPrice: '',
  capacity: '',
  location: '',
  area: '',
};

/** The series editor's fields, by the names its errors use, in the order the form shows them. */
export type SeriesFieldKey =
  | 'title'
  | 'category'
  | 'host'
  | 'description'
  | 'image'
  | 'seriesPrice'
  | 'dropInPrice'
  | 'capacity'
  | 'location'
  | 'area';

/** The message under each field that must change, by field. */
export type SeriesFieldErrors = Partial<Record<SeriesFieldKey, string>>;

/** The id of each field's control, which the error summary's links name (the mock's `f-…` ids). */
export const SERIES_FIELD_IDS: Record<SeriesFieldKey, string> = {
  title: 'f-title',
  category: 'f-category',
  host: 'f-host',
  description: 'f-description',
  image: 'f-image',
  seriesPrice: 'f-series-price',
  dropInPrice: 'f-drop-in-price',
  capacity: 'f-capacity',
  location: 'f-place',
  area: 'f-area',
};

const FIELD_ORDER = Object.keys(SERIES_FIELD_IDS) as SeriesFieldKey[];

/** The words "Free", any case, which a price field takes for $0. */
const FREE = /^free$/i;

/** The series price in cents: blank or "Free" is 0; `null` when it is not an amount. */
export function seriesPriceCentsOf(text: string): number | null {
  return FREE.test(text.trim()) ? 0 : priceCentsOf(text);
}

/**
 * The drop-in price in cents: blank is no drop-in (`null`), "Free" is 0; an amount that is not one
 * is `undefined`, which {@link seriesDraftProblemsOf} names before anything is sent.
 */
export function dropInPriceCentsOf(text: string): number | null | undefined {
  if (text.trim() === '') return null;
  return seriesPriceCentsOf(text) ?? undefined;
}

/** A price in cents as the editor shows it: 0 is "Free", 6400 is "$64"; no drop-in is blank. */
export function seriesPriceTextOf(cents: number | null): string {
  if (cents === null) return '';
  return cents <= 0 ? 'Free' : priceTextOf(cents);
}

/** What the editor opens with for a saved series (L2-071 AC13; mock `series-editor/edit`). */
export function seriesEditorValuesOf(series: AdminSeriesDto): SeriesEditorValues {
  return {
    title: series.title,
    category: series.category,
    hostListingId: series.host.id,
    hostName: series.host.name,
    description: series.summary,
    imageKey: series.imageKey,
    imageName: series.imageKey ? KEPT_IMAGE_NAME : null,
    seriesPrice: seriesPriceTextOf(series.priceCents),
    dropInPrice: seriesPriceTextOf(series.dropInPriceCents),
    capacity: String(series.capacity),
    location: series.place,
    area: series.area,
  };
}

/** What Create series and Save changes send for the editor's values: text as typed, numbers as numbers. */
export function seriesDraftOf(values: SeriesEditorValues): SeriesDraftDto {
  return {
    title: values.title,
    category: values.category,
    summary: values.description,
    imageKey: values.imageKey,
    hostListingId: values.hostListingId,
    priceCents: seriesPriceCentsOf(values.seriesPrice),
    dropInPriceCents: dropInPriceCentsOf(values.dropInPrice) ?? null,
    capacity: capacityOf(values.capacity),
    place: values.location,
    area: values.area,
  };
}

/** The mock's words for what the editor names before it sends (mock `series-editor/invalid`). */
const TITLE_MISSING = 'Give the series a title members will recognize';
const HOST_MISSING = 'Choose a Listed host';
const CAPACITY_TOO_LOW = 'Set a capacity of at least 1';
const PRICE_INVALID = 'Use a price from $0 to $10,000';

/** "31 members have joined. Set a capacity of at least 31", or the one-member form (mock `series-editor/edit-invalid`). */
export function capacityBelowJoinedMessage(joined: number): string {
  const have = joined === 1 ? '1 member has' : `${joined} members have`;
  return `${have} joined. Set a capacity of at least ${joined}`;
}

/**
 * What must change before the editor sends (L2-071 AC13, AC15; mocks `series-editor/invalid` and
 * `edit-invalid`): a blank title, no chosen host, a capacity that is not a whole number of at least
 * 1 or, for a saved series, below the `joined` members, and a price that is not an amount. The API
 * holds the other rules and names them by code ({@link seriesFieldErrorsOf}).
 */
export function seriesDraftProblemsOf(values: SeriesEditorValues, joined = 0): SeriesFieldErrors {
  const problems: SeriesFieldErrors = {};
  if (values.title.trim() === '') problems.title = TITLE_MISSING;
  if (values.hostListingId === null) problems.host = HOST_MISSING;
  if (seriesPriceCentsOf(values.seriesPrice) === null) problems.seriesPrice = PRICE_INVALID;
  if (dropInPriceCentsOf(values.dropInPrice) === undefined) problems.dropInPrice = PRICE_INVALID;
  const capacity = capacityOf(values.capacity);
  if (capacity === null || capacity < 1) problems.capacity = CAPACITY_TOO_LOW;
  else if (capacity < joined) problems.capacity = capacityBelowJoinedMessage(joined);
  return problems;
}

/** The editor field a `fieldCodes` key (the API's camel-case property) belongs to. */
const FIELD_OF_KEY: Record<string, SeriesFieldKey> = {
  title: 'title',
  category: 'category',
  hostListingId: 'host',
  summary: 'description',
  imageKey: 'image',
  image: 'image',
  priceCents: 'seriesPrice',
  dropInPriceCents: 'dropInPrice',
  capacity: 'capacity',
  place: 'location',
  area: 'area',
};

/** What each field code says to staff (ADR 0021, ADR 0025, ADR 0089, ADR 0091). */
const MESSAGES: Record<string, string> = {
  title_required: TITLE_MISSING,
  title_too_long: 'Use 120 characters or fewer',
  category_required: 'Choose a category from the list',
  host_required: HOST_MISSING,
  host_not_listed: HOST_MISSING,
  summary_required: 'Give a description',
  summary_too_long: 'Use 1,000 characters or fewer',
  image_invalid: 'Use a JPEG, PNG or WebP image up to 5 MB',
  price_invalid: PRICE_INVALID,
  capacity_required: CAPACITY_TOO_LOW,
  capacity_out_of_range: 'Use a capacity from 1 to 10,000',
  place_required: 'Say where it happens',
  place_too_long: 'Use 200 characters or fewer',
  area_required: 'Give the neighbourhood and city',
  area_too_long: 'Use 100 characters or fewer',
};

const UNKNOWN_CODE = 'Check this field';

/**
 * The messages for the fields the API refused (L2-071 AC11, AC13, AC15), or `null` when the failure
 * is not a field's: a `validation_failed` body names each failed field's code in `fieldCodes`, and
 * `capacity_below_joined` (409) is Capacity's, with `joined` the members the editor opened with. The
 * server's own sentences are never shown.
 */
export function seriesFieldErrorsOf(error: ApiError, joined = 0): SeriesFieldErrors | null {
  if (error.code === 'capacity_below_joined') {
    return { capacity: capacityBelowJoinedMessage(joined) };
  }
  if (error.status !== 400 || !error.fieldCodes) return null;
  const errors: SeriesFieldErrors = {};
  for (const [key, code] of Object.entries(error.fieldCodes)) {
    const field = FIELD_OF_KEY[key];
    if (field) errors[field] = MESSAGES[code] ?? UNKNOWN_CODE;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The fields to fix as the error summary's lines, in the form's order. */
export function seriesErrorItems(
  errors: SeriesFieldErrors,
): readonly { text: string; target: string }[] {
  return FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: SERIES_FIELD_IDS[field] }] : [];
  });
}
