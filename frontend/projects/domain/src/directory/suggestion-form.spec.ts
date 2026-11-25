import { firstNameOf } from '../account/join';
import {
  checkSuggestion,
  clearSuggestionError,
  emptySuggestionForm,
  firstSuggestionFieldOf,
  type SuggestionForm,
  suggestionFormOf,
  suggestionRequestOf,
  thanksOf,
} from './suggestion-form';

const filled: SuggestionForm = {
  relation: 'someone-i-know',
  kind: 'church-ministry',
  name: '  Eastside Ladies Who Lift ',
  where: ' Danforth & Pape, Toronto',
  website: ' instagram.com/eastsideladieslift ',
  churchConnection: '   ',
  reason: 'Saturday strength group. ',
  email: ' lead@eastside.example ',
  mayTellWhoSuggested: false,
};

// L2-062 AC3 (mock `self`): one row per relation.
describe('suggestionFormOf', () => {
  it.each([
    {
      relation: 'myself' as const,
      expected: {
        nameLabel: 'Your name or your organization’s',
        reasonLabel: 'What should members know about you?',
        asksContact: false,
      },
    },
    {
      relation: 'someone-i-know' as const,
      expected: {
        nameLabel: 'Their name',
        reasonLabel: 'Why should they be listed?',
        asksContact: true,
      },
    },
    {
      relation: 'somewhere-ive-been' as const,
      expected: {
        nameLabel: 'Their name',
        reasonLabel: 'Why should they be listed?',
        asksContact: true,
      },
    },
  ])('$relation', ({ relation, expected }) => {
    expect(suggestionFormOf(relation)).toEqual(expected);
  });
});

// L2-062 AC4 (ADR 0084): only a blank name or place is marked before sending. One case per row.
describe('checkSuggestion', () => {
  it.each<{ why: string; form: Partial<SuggestionForm>; expected: Record<string, string> }>([
    { why: 'name and place given', form: { name: 'A', where: 'B' }, expected: {} },
    {
      why: 'nothing typed',
      form: {},
      expected: {
        name: 'Add a name so we know who to look up.',
        where: 'Add where they meet or work.',
      },
    },
    {
      why: 'name only white space',
      form: { name: '  ', where: 'Toronto' },
      expected: { name: 'Add a name so we know who to look up.' },
    },
    {
      why: 'place missing',
      form: { name: 'Eastside', where: '' },
      expected: { where: 'Add where they meet or work.' },
    },
    {
      why: 'optional fields and a long name are the API’s',
      form: { name: 'n'.repeat(500), where: 'Toronto', website: 'not a site', email: 'nope' },
      expected: {},
    },
  ])('$why', ({ form, expected }) => {
    expect(checkSuggestion({ ...emptySuggestionForm(), ...form })).toEqual(expected);
  });
});

describe('firstSuggestionFieldOf', () => {
  it.each([
    { errors: {}, expected: null },
    { errors: { where: 'x' }, expected: 'f-where' },
    { errors: { email: 'x', name: 'y' }, expected: 'f-name' },
    { errors: { reason: 'x', churchConnection: 'y' }, expected: 'f-church' },
  ])('$expected', ({ errors, expected }) => {
    expect(firstSuggestionFieldOf(errors)).toBe(expected);
  });
});

describe('clearSuggestionError', () => {
  it('drops only the field changed', () => {
    expect(clearSuggestionError({ name: 'a', where: 'b' }, 'name')).toEqual({ where: 'b' });
  });

  it('keeps the same object when the field had no message', () => {
    const errors = { where: 'b' };
    expect(clearSuggestionError(errors, 'name')).toBe(errors);
  });
});

// ADR 0084: trimmed, blank optional text as null, and nothing of the contact for Myself.
describe('suggestionRequestOf', () => {
  it('trims every text and sends a blank optional one as null', () => {
    expect(suggestionRequestOf(filled)).toEqual({
      relation: 'someone-i-know',
      kind: 'church-ministry',
      name: 'Eastside Ladies Who Lift',
      where: 'Danforth & Pape, Toronto',
      website: 'instagram.com/eastsideladieslift',
      churchConnection: null,
      reason: 'Saturday strength group.',
      email: 'lead@eastside.example',
      mayTellWhoSuggested: false,
    });
  });

  it('leaves out the email and the permission for Myself, whatever they held', () => {
    const request = suggestionRequestOf({ ...filled, relation: 'myself' });
    expect(Object.keys(request).sort()).toEqual([
      'churchConnection',
      'kind',
      'name',
      'reason',
      'relation',
      'website',
      'where',
    ]);
  });

  it('sends a blank email as null for someone else', () => {
    expect(suggestionRequestOf({ ...filled, email: ' ' }).email).toBeNull();
  });
});

// L2-062 AC5: the thanks, worded as Home's greeting is (`welcomeOf`). One case per row.
describe('thanksOf and firstNameOf', () => {
  it.each([
    { name: 'Grace Thompson', first: 'Grace', expected: 'Thanks, Grace' },
    { name: '  Grace   Thompson ', first: 'Grace', expected: 'Thanks, Grace' },
    { name: 'Mary-Kate O’Neil', first: 'Mary-Kate', expected: 'Thanks, Mary-Kate' },
    { name: '   ', first: null, expected: 'Thanks' },
    { name: null, first: null, expected: 'Thanks' },
  ])('"$name"', ({ name, first, expected }) => {
    expect(firstNameOf(name)).toBe(first);
    expect(thanksOf(name)).toBe(expected);
  });
});
