import {
  contrastOf,
  PICK_ASSETS,
  PICK_PLATFORMS,
  pickFileNameOf,
  pickPlatformOf,
  pickShadeFor,
  type Rgb,
} from './pick-assets';

// L2-072 AC4, AC5: five files for four platforms, each at its platform's size.
describe('PICK_PLATFORMS', () => {
  it('lists the four platforms and the five assets at their sizes', () => {
    expect(
      PICK_PLATFORMS.map((p) => [p.name, p.assets.map((a) => [a.label, a.width, a.height])]),
    ).toEqual([
      [
        'Instagram',
        [
          ['Post · 1080 × 1080', 1080, 1080],
          ['Story · 1080 × 1920', 1080, 1920],
        ],
      ],
      ['Facebook', [['Link image · 1200 × 630', 1200, 630]]],
      ['WhatsApp', [['Image · 1080 × 1080', 1080, 1080]]],
      ['Slack', [['Unfurl image · 1200 × 630', 1200, 630]]],
    ]);
    expect(PICK_ASSETS.map((a) => a.key)).toEqual([
      'instagram-post',
      'instagram-story',
      'facebook',
      'whatsapp',
      'slack',
    ]);
  });
});

describe('pickPlatformOf', () => {
  it.each([
    { value: 'slack', expected: 'Slack' },
    { value: 'facebook', expected: 'Facebook' },
    { value: null, expected: 'Instagram' },
    { value: 'tiktok', expected: 'Instagram' },
  ])('reads ?platform=$value as $expected', ({ value, expected }) => {
    expect(pickPlatformOf(value).name).toBe(expected);
  });
});

// ADR 0098: community-pick-<title in lower case, hyphenated>-<platform>[-post|-story].png.
describe('pickFileNameOf', () => {
  it.each([
    {
      title: 'Easter Sunrise 5K',
      key: 'instagram-post',
      expected: 'community-pick-easter-sunrise-5k-instagram-post.png',
    },
    {
      title: "Women's Hoops & Devotion Night",
      key: 'slack',
      expected: 'community-pick-womens-hoops-devotion-night-slack.png',
    },
    {
      title: 'Couch to 5K: Week 3',
      key: 'facebook',
      expected: 'community-pick-couch-to-5k-week-3-facebook.png',
    },
    { title: '  Café  Run! ', key: 'whatsapp', expected: 'community-pick-cafe-run-whatsapp.png' },
    { title: '***', key: 'whatsapp', expected: 'community-pick-whatsapp.png' },
  ])('names "$title" $key as $expected', ({ title, key, expected }) => {
    expect(pickFileNameOf(title, key)).toBe(expected);
  });
});

describe('contrastOf', () => {
  it.each<{ a: Rgb; b: Rgb; expected: number }>([
    { a: [0, 0, 0], b: [255, 255, 255], expected: 21 },
    { a: [255, 255, 255], b: [255, 255, 255], expected: 1 },
    { a: [255, 255, 255], b: [118, 118, 118], expected: 4.54 },
  ])('$a against $b is $expected:1', ({ a, b, expected }) => {
    expect(contrastOf(a, b)).toBeCloseTo(expected, 2);
  });
});

// ADR 0098: the least brand overlay, in steps of 0.05, that brings every sample under the text to
// 4.5:1 against every text colour. Expected values were worked independently from the WCAG formula.
describe('pickShadeFor', () => {
  const WHITE: Rgb = [255, 255, 255];
  const BLACK: Rgb = [0, 0, 0];
  const BRAND: Rgb = [110, 20, 40];
  it.each<{ why: string; samples: Rgb[]; overlay: Rgb; text: Rgb[]; expected: number }>([
    {
      why: 'a dark photo needs none',
      samples: [BLACK],
      overlay: BLACK,
      text: [WHITE],
      expected: 0,
    },
    {
      why: 'a white photo needs 0.55 of black',
      samples: [WHITE],
      overlay: BLACK,
      text: [WHITE],
      expected: 0.55,
    },
    {
      why: 'the stricter text colour decides',
      samples: [WHITE],
      overlay: BLACK,
      text: [WHITE, [255, 255, 0]],
      expected: 0.6,
    },
    {
      why: 'the lightest sample decides',
      samples: [BLACK, [200, 200, 200]],
      overlay: BRAND,
      text: [WHITE],
      expected: 0.55,
    },
    { why: 'no samples need none', samples: [], overlay: BLACK, text: [WHITE], expected: 0 },
    {
      why: 'an overlay that never gets there is full',
      samples: [WHITE],
      overlay: WHITE,
      text: [WHITE],
      expected: 1,
    },
  ])('$why', ({ samples, overlay, text, expected }) => {
    expect(pickShadeFor(samples, overlay, text)).toBe(expected);
  });
});
