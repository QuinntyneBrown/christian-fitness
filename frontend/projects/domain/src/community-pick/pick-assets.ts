/** A platform Community Pick makes posts for, as its `?platform=` value. */
export type PickPlatform = 'instagram' | 'facebook' | 'whatsapp' | 'slack';

/** A graphic's shape: a square, a 9:16 story or a 1200 × 630 link image. */
export type PickShape = 'square' | 'story' | 'landscape';

/** One of the five PNGs: its key, its label beside the image, its shape and pixel size. */
export interface PickAssetSpec {
  /** The file's platform suffix, such as `instagram-post` or `slack`. */
  key: string;
  label: string;
  shape: PickShape;
  width: number;
  height: number;
}

/** A platform, its name in the switch, and its assets in the order shown (L2-072 AC4, AC5). */
export interface PickPlatformSpec {
  key: PickPlatform;
  name: string;
  assets: readonly PickAssetSpec[];
}

const SQUARE = { shape: 'square', width: 1080, height: 1080 } as const;
const STORY = { shape: 'story', width: 1080, height: 1920 } as const;
const LANDSCAPE = { shape: 'landscape', width: 1200, height: 630 } as const;

/** Instagram post and story, a Facebook link image, a WhatsApp square and a Slack unfurl image. */
export const PICK_PLATFORMS: readonly PickPlatformSpec[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    assets: [
      { key: 'instagram-post', label: 'Post · 1080 × 1080', ...SQUARE },
      { key: 'instagram-story', label: 'Story · 1080 × 1920', ...STORY },
    ],
  },
  {
    key: 'facebook',
    name: 'Facebook',
    assets: [{ key: 'facebook', label: 'Link image · 1200 × 630', ...LANDSCAPE }],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    assets: [{ key: 'whatsapp', label: 'Image · 1080 × 1080', ...SQUARE }],
  },
  {
    key: 'slack',
    name: 'Slack',
    assets: [{ key: 'slack', label: 'Unfurl image · 1200 × 630', ...LANDSCAPE }],
  },
];

/** Every one of the five assets, in the order they are drawn. */
export const PICK_ASSETS: readonly PickAssetSpec[] = PICK_PLATFORMS.flatMap((p) => p.assets);

/** The platform `?platform=` names, Instagram when it names none of them. */
export function pickPlatformOf(value: string | null): PickPlatformSpec {
  return PICK_PLATFORMS.find((platform) => platform.key === value) ?? PICK_PLATFORMS[0];
}

/**
 * The PNG's file name (ADR 0098): `community-pick-<title>-<asset>.png`, the title in lower case
 * with apostrophes dropped and every other run of non-letters and non-digits one hyphen.
 */
export function pickFileNameOf(title: string, assetKey: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `community-pick-${slug ? `${slug}-` : ''}${assetKey}.png`;
}

/** An sRGB colour, each channel 0 to 255. */
export type Rgb = readonly [number, number, number];

/** The least contrast between the graphic's text and what is under it (WCAG 2.2 AA, 1.4.3). */
export const PICK_MIN_CONTRAST = 4.5;

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The WCAG contrast ratio of two colours, 1 to 21. */
export function contrastOf(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** `under` with `overlay` drawn over it at `opacity`, blended per sRGB channel as a canvas does. */
export function blendOf(under: Rgb, overlay: Rgb, opacity: number): Rgb {
  return [0, 1, 2].map((i) => under[i] * (1 - opacity) + overlay[i] * opacity) as unknown as Rgb;
}

/**
 * The least opacity of the brand `overlay`, in steps of 0.05, at which every `sample` of the
 * picture under the text reaches 4.5:1 against every `text` colour (ADR 0098); 1 when only the
 * full overlay does. No sample needs none.
 */
export function pickShadeFor(samples: readonly Rgb[], overlay: Rgb, text: readonly Rgb[]): number {
  for (let step = 0; step <= 20; step++) {
    const opacity = step / 20;
    const enough = samples.every((sample) => {
      const under = blendOf(sample, overlay, opacity);
      return text.every((colour) => contrastOf(under, colour) >= PICK_MIN_CONTRAST);
    });
    if (enough) return opacity;
  }
  return 1;
}
