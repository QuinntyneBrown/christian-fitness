import { safeContactUrl } from './contact-link';

// L2-014 AC2 (ADR 0000): the same rows as ServiceListingContactUrlTests.cs. What the API keeps as a
// contact link, the page opens; anything else is never opened.
describe('safeContactUrl', () => {
  it.each([
    { why: 'https', url: 'https://marcus.example.org/book', safe: true },
    { why: 'http', url: 'http://marcus.example.org', safe: true },
    {
      why: 'upper case scheme and host',
      url: 'HTTPS://Marcus.Example.org/Book?x=1#top',
      safe: true,
    },
    { why: 'padded', url: '  https://marcus.example.org/book  ', safe: true },
    { why: 'javascript', url: 'javascript:alert(1)', safe: false },
    { why: 'data', url: 'data:text/html,hi', safe: false },
    { why: 'mailto', url: 'mailto:marcus@example.org', safe: false },
    { why: 'ftp', url: 'ftp://marcus.example.org', safe: false },
    { why: 'scheme-relative', url: '//marcus.example.org', safe: false },
    { why: 'no scheme', url: 'marcus.example.org', safe: false },
    { why: 'sign-in details', url: 'https://user:secret@marcus.example.org', safe: false },
    { why: 'no host', url: 'https://', safe: false },
    {
      why: 'over 2,000 characters',
      url: `https://marcus.example.org/${'a'.repeat(2000)}`,
      safe: false,
    },
  ])('$why', ({ url, safe }) => {
    expect(safeContactUrl(url)).toBe(safe ? url.trim() : null);
  });
});
