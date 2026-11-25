import { eventsNoResults } from './events-no-results';

// L2-009 AC3, L2-075 AC3, L2-076 AC2 (ADR 0030, ADR 0081): what the list says when nothing matches.
// "Only events I'm going to" is named first, then the search, then the category alone; with
// nothing chosen it is not a no-results state but the empty list.
describe('eventsNoResults', () => {
  const going = {
    heading: 'No events you’re going to',
    text: 'You have no upcoming registrations matching these filters.',
    action: 'Clear search and filters',
  };
  const search = {
    heading: 'No events match your search',
    text: 'Try another search or clear the search and filters.',
    action: 'Clear search and filters',
  };

  it.each([
    { why: 'nothing chosen', query: { category: null, q: '', going: false }, expected: null },
    {
      why: 'a category alone',
      query: { category: 'workshop', q: '', going: false },
      expected: {
        heading: 'Nothing here yet',
        text: 'No workshop events right now. New ones are posted every week.',
        action: 'Clear filter',
      },
    },
    { why: 'a search', query: { category: null, q: 'yoga', going: false }, expected: search },
    {
      why: 'a search and a category',
      query: { category: 'run', q: 'yoga', going: false },
      expected: search,
    },
    { why: 'only mine', query: { category: null, q: '', going: true }, expected: going },
    {
      why: 'only mine, a search and a category',
      query: { category: 'run', q: 'yoga', going: true },
      expected: going,
    },
  ] as const)('$why', ({ query, expected }) => {
    expect(eventsNoResults(query)).toEqual(expected);
  });
});
