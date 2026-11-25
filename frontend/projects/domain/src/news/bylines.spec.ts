import type { ApiError, BylineDto } from '@cf/api';
import {
  bylineDraftOf,
  bylineErrorHeading,
  bylineErrorItems,
  bylineErrorsOf,
  bylineGone,
  bylineInUse,
  bylineMissing,
  bylineNameTaken,
  bylineStoriesText,
  bylineValuesOf,
  withByline,
  withoutByline,
} from './bylines';

const MARCUS: BylineDto = {
  id: '0193a9c0-0000-7000-8000-0000000b7003',
  name: 'Marcus Bell',
  bio: 'Personal trainer who writes beginner guides and profiles of our professionals.',
  photoKey: null,
  stories: 2,
};

function refused(status: number, code: string, fieldCodes?: Record<string, string>): ApiError {
  return fieldCodes ? { status, code, fieldCodes } : { status, code };
}

// L2-077 AC1 (ADR 0093): how many stories use a byline, as the "Used by" column reads it.
describe('bylineStoriesText', () => {
  it.each<{ stories: number; expected: string }>([
    { stories: 0, expected: 'Not used yet' },
    { stories: 1, expected: '1 story' },
    { stories: 2, expected: '2 stories' },
    { stories: 1200, expected: '1,200 stories' },
  ])('$stories reads "$expected"', ({ stories, expected }) => {
    expect(bylineStoriesText(stories)).toBe(expected);
  });
});

describe('bylineValuesOf', () => {
  it('opens Add byline blank', () => {
    expect(bylineValuesOf(null)).toEqual({ name: '', bio: '', photoKey: null, photoName: null });
  });

  it('opens Edit on the byline as it stands', () => {
    expect(bylineValuesOf({ ...MARCUS, photoKey: 'abc.png' })).toEqual({
      name: 'Marcus Bell',
      bio: MARCUS.bio,
      photoKey: 'abc.png',
      photoName: null,
    });
  });
});

describe('bylineDraftOf', () => {
  it('sends the name, bio and photo key as typed', () => {
    expect(
      bylineDraftOf({ name: ' Esther ', bio: 'Runs.', photoKey: 'k.png', photoName: 'me.png' }),
    ).toEqual({ name: ' Esther ', bio: 'Runs.', photoKey: 'k.png' });
  });
});

// L2-077 AC3: a missing name or bio is named before anything is sent.
describe('bylineMissing', () => {
  it.each<{ name: string; bio: string; expected: Record<string, string> | null }>([
    { name: 'Esther', bio: 'Runs.', expected: null },
    { name: '  ', bio: 'Runs.', expected: { name: 'Add a name' } },
    { name: 'Esther', bio: '', expected: { bio: 'Add a short bio' } },
    { name: '', bio: ' ', expected: { name: 'Add a name', bio: 'Add a short bio' } },
  ])('name "$name" and bio "$bio"', ({ name, bio, expected }) => {
    expect(bylineMissing({ name, bio, photoKey: null, photoName: null })).toEqual(expected);
  });
});

// L2-077 AC3, AC4 (ADR 0093): each refusal the API answers, as the dialog words it.
describe('bylineErrorsOf', () => {
  it.each<{ why: string; error: unknown; expected: Record<string, string> | null }>([
    {
      why: 'a name another byline has',
      error: refused(409, 'byline_name_taken'),
      expected: { name: 'A byline called Priya Raman already exists' },
    },
    {
      why: 'the required fields',
      error: refused(400, 'validation_failed', { name: 'name_required', bio: 'bio_required' }),
      expected: { name: 'Add a name', bio: 'Add a short bio' },
    },
    {
      why: 'the too-long fields',
      error: refused(400, 'validation_failed', { name: 'name_too_long', bio: 'bio_too_long' }),
      expected: { name: 'Use 80 characters or fewer', bio: 'Use 200 characters or fewer' },
    },
    {
      why: 'a photo key the API does not hold',
      error: refused(400, 'validation_failed', { photoKey: 'photo_invalid' }),
      expected: { photo: 'Use a JPEG, PNG or WebP image up to 5 MB' },
    },
    {
      why: 'an upload that is not an image',
      error: refused(400, 'validation_failed', { photo: 'photo_invalid' }),
      expected: { photo: 'Use a JPEG, PNG or WebP image up to 5 MB' },
    },
    {
      why: 'a code it does not know',
      error: refused(400, 'validation_failed', { name: 'name_odd' }),
      expected: { name: 'Check this field' },
    },
    {
      why: 'a field the dialog does not have',
      error: refused(400, 'validation_failed', { colour: 'colour_required' }),
      expected: null,
    },
    { why: 'a server error', error: refused(500, 'server_error'), expected: null },
    { why: 'no answer', error: refused(0, 'network'), expected: null },
  ])('$why', ({ error, expected }) => {
    expect(bylineErrorsOf(error, 'Priya Raman')).toEqual(expected);
  });
});

describe('bylineErrorItems', () => {
  it('lists the refused fields in the form order, each linked to its field', () => {
    expect(
      bylineErrorItems({ photo: 'Use a JPEG', bio: 'Add a short bio', name: 'Add a name' }),
    ).toEqual([
      { text: 'Add a name', target: 'f-name' },
      { text: 'Add a short bio', target: 'f-bio' },
      { text: 'Use a JPEG', target: 'f-photo' },
    ]);
  });
});

describe('bylineErrorHeading', () => {
  it.each([
    [1, '1 thing to fix'],
    [2, '2 things to fix'],
  ])('%i reads "%s"', (count, expected) => {
    expect(bylineErrorHeading(count)).toBe(expected);
  });
});

describe('bylineGone, bylineInUse and bylineNameTaken', () => {
  it.each<{ error: ApiError; expected: [boolean, boolean, boolean] }>([
    { error: refused(404, 'not_found'), expected: [true, false, false] },
    { error: refused(409, 'byline_in_use'), expected: [false, true, false] },
    { error: refused(409, 'byline_name_taken'), expected: [false, false, true] },
    { error: refused(500, 'server_error'), expected: [false, false, false] },
  ])('$error.status $error.code', ({ error, expected }) => {
    expect([bylineGone(error), bylineInUse(error), bylineNameTaken(error)]).toEqual(expected);
  });
});

// ADR 0093: a saved byline takes its place in the list as the API orders it, by the name without
// regard to case (ordinal, as `NameKey`), then by id; a removed one leaves it.
describe('withByline and withoutByline', () => {
  const byline = (id: string, name: string): BylineDto => ({
    id,
    name,
    bio: 'Bio.',
    photoKey: null,
    stories: 0,
  });
  const list = [byline('1', 'CF Team'), byline('2', 'marcus Bell'), byline('3', 'Priya Raman')];

  it.each<{ why: string; saved: BylineDto; expected: string[] }>([
    {
      why: 'a new byline goes in name order',
      saved: byline('4', 'Naomi'),
      expected: ['1', '2', '4', '3'],
    },
    { why: 'case does not count', saved: byline('4', 'a writer'), expected: ['4', '1', '2', '3'] },
    { why: 'an edited byline is replaced', saved: byline('2', 'Zed'), expected: ['1', '3', '2'] },
    { why: 'a tie goes by id', saved: byline('0', 'CF TEAM'), expected: ['0', '1', '2', '3'] },
  ])('$why', ({ saved, expected }) => {
    expect(withByline(list, saved).map((b) => b.id)).toEqual(expected);
  });

  it('keeps the edited name', () => {
    expect(withByline(list, byline('2', 'Zed')).at(-1)?.name).toBe('Zed');
  });

  it('removes a byline by id', () => {
    expect(withoutByline(list, '2').map((b) => b.id)).toEqual(['1', '3']);
  });
});
