import { pickShadeFor, type PickAssetSpec, type Rgb } from '@cf/domain';

/** What a graphic says, and where its photo is (none draws the brand pattern). */
export interface PickArtInput {
  title: string;
  /** "Sat Apr 18 · 6:45 AM · Waterfront". */
  when: string;
  note: string;
  /** The event's photo, same origin, or none. */
  photoSrc: string | null;
}

/** The brand's colours, read from the design tokens on `:root` when drawing. */
interface Brand {
  bg: string;
  fg: string;
  highlight: string;
  inverseBg: string;
  inverseFg: string;
}

const FACES = [
  '700 32px "Barlow"',
  '600 32px "Barlow"',
  '400 32px "Barlow"',
  'italic 600 32px "Barlow Condensed"',
];

/**
 * Draws the Community Pick graphic of `input` at each of `assets`' exact sizes and exports each as
 * a PNG (L2-072 AC5, AC12; ADR 0098). Loaded with a dynamic `import()` on the first Create only.
 * It fetches the photo with `fetch` and `signal`, waits for the self-hosted brand faces, draws the
 * photo (or the brand pattern), the brand shade from the bottom, then darkens what is under the
 * text with the least brand overlay (`pickShadeFor`) that brings it to 4.5:1 against the text's
 * colours, and the text. Each canvas is dropped once exported. A failed photo, font or export
 * rejects.
 */
export async function renderPickArt(
  input: PickArtInput,
  assets: readonly PickAssetSpec[],
  signal: AbortSignal,
): Promise<Blob[]> {
  const [photo] = await Promise.all([
    input.photoSrc ? loadPhoto(input.photoSrc, signal) : Promise.resolve(null),
    Promise.all(FACES.map((face) => document.fonts.load(face))),
  ]);
  try {
    const brand = brandOf();
    const blobs: Blob[] = [];
    for (const asset of assets) {
      signal.throwIfAborted();
      blobs.push(await draw(input, asset, photo, brand));
    }
    return blobs;
  } finally {
    photo?.close();
  }
}

async function loadPhoto(src: string, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error(`The photo answered ${response.status}`);
  return createImageBitmap(await response.blob());
}

function brandOf(): Brand {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => style.getPropertyValue(name).trim();
  return {
    bg: token('--color-bg-brand'),
    fg: token('--color-fg-on-brand'),
    highlight: token('--color-fg-on-brand-highlight'),
    inverseBg: token('--color-bg-brand-inverse'),
    inverseFg: token('--color-fg-brand-inverse'),
  };
}

/** A CSS colour as sRGB channels, read back through a canvas so any CSS form is understood. */
function rgbOf(context: CanvasRenderingContext2D, colour: string): Rgb {
  context.fillStyle = '#000';
  context.fillStyle = colour;
  const value = String(context.fillStyle);
  if (value.startsWith('#')) {
    return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as unknown as Rgb;
  }
  const [r, g, b] = value.match(/[\d.]+/g)!.map(Number);
  return [r, g, b];
}

/** Breaks `text` into lines no wider than `width` in the context's current font. */
function linesOf(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface TextBlock {
  font: string;
  size: number;
  colour: string;
  lines: string[];
  lineHeight: number;
  gapBefore: number;
}

async function draw(
  input: PickArtInput,
  asset: PickAssetSpec,
  photo: ImageBitmap | null,
  brand: Brand,
): Promise<Blob> {
  const { width: w, height: h } = asset;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const landscape = asset.shape === 'landscape';
  // The design system's sizes, in hundredths of the width (cqw).
  const u = w / 100;
  const inset = 6 * u;
  const textWidth = w - 2 * inset;

  // The photo covers the box, or the brand pattern stands in for it.
  context.fillStyle = brand.bg;
  context.fillRect(0, 0, w, h);
  if (photo) {
    const scale = Math.max(w / photo.width, h / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    context.drawImage(photo, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    drawPattern(context, w, h, u, brand.inverseBg);
  }

  // The brand shade fades up from the bottom (20% solid, clear at 75%).
  const shade = context.createLinearGradient(0, h, 0, 0);
  shade.addColorStop(0.2, brand.bg);
  shade.addColorStop(0.75, withAlpha(context, brand.bg, 0));
  context.fillStyle = shade;
  context.fillRect(0, 0, w, h);

  // The text, laid out from the bottom up.
  const titleSize = (landscape ? 6.5 : 9) * u;
  const smallSize = (landscape ? 2.6 : 3.4) * u;
  context.font = `italic 600 ${titleSize}px "Barlow Condensed"`;
  const title = linesOf(context, input.title.toUpperCase(), textWidth);
  context.font = `600 ${smallSize}px "Barlow"`;
  const when = linesOf(context, input.when, textWidth);
  context.font = `400 ${smallSize}px "Barlow"`;
  const note = linesOf(context, input.note, textWidth);
  const blocks: TextBlock[] = [
    {
      font: `italic 600 ${titleSize}px "Barlow Condensed"`,
      size: titleSize,
      colour: brand.fg,
      lines: title,
      lineHeight: titleSize,
      gapBefore: 0,
    },
    {
      font: `600 ${smallSize}px "Barlow"`,
      size: smallSize,
      colour: brand.highlight,
      lines: when,
      lineHeight: smallSize * 1.5,
      gapBefore: 2 * u,
    },
    {
      font: `400 ${smallSize}px "Barlow"`,
      size: smallSize,
      colour: brand.fg,
      lines: note,
      lineHeight: smallSize * 1.375,
      gapBefore: note.length ? 1.5 * u : 0,
    },
  ];
  const textHeight = blocks.reduce(
    (sum, block) => sum + block.gapBefore + block.lines.length * block.lineHeight,
    0,
  );
  const top = h - inset - textHeight;

  // Darken what is under the text until it meets 4.5:1 against both text colours.
  const samples = samplesOf(context, w, Math.max(0, Math.floor(top)), h);
  const overlay = rgbOf(context, brand.bg);
  const opacity = pickShadeFor(samples, overlay, [
    rgbOf(context, brand.fg),
    rgbOf(context, brand.highlight),
  ]);
  if (opacity > 0) {
    const fadeFrom = Math.max(0, top - inset);
    const extra = context.createLinearGradient(0, fadeFrom, 0, top);
    extra.addColorStop(0, withAlpha(context, brand.bg, 0));
    extra.addColorStop(1, withAlpha(context, brand.bg, opacity));
    context.fillStyle = extra;
    context.fillRect(0, fadeFrom, w, top - fadeFrom);
    context.fillStyle = withAlpha(context, brand.bg, opacity);
    context.fillRect(0, top, w, h - top);
  }

  // "Community Pick", a pill in the inverse brand colours.
  const labelSize = 3.2 * u;
  context.font = `700 ${labelSize}px "Barlow"`;
  context.letterSpacing = `${labelSize * 0.1}px`;
  const label = 'COMMUNITY PICK';
  const labelWidth = context.measureText(label).width + 6 * u;
  const labelHeight = labelSize * 1.5 + 2.4 * u;
  context.fillStyle = brand.inverseBg;
  context.beginPath();
  context.roundRect(inset, inset, labelWidth, labelHeight, labelHeight / 2);
  context.fill();
  context.fillStyle = brand.inverseFg;
  context.textBaseline = 'middle';
  context.fillText(label, inset + 3 * u, inset + labelHeight / 2);
  context.letterSpacing = '0px';

  let y = top;
  context.textBaseline = 'top';
  for (const block of blocks) {
    y += block.gapBefore;
    context.font = block.font;
    context.fillStyle = block.colour;
    for (const line of block.lines) {
      context.fillText(line, inset, y + (block.lineHeight - block.size) / 2);
      y += block.lineHeight;
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error('The graphic did not export');
  return blob;
}

/** The brand pattern: diagonal stripes of the inverse colour at 35% over the brand colour. */
function drawPattern(
  context: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  colour: string,
): void {
  context.save();
  context.globalAlpha = 0.35;
  context.strokeStyle = colour;
  context.lineWidth = 0.6 * u * Math.SQRT2;
  const step = 4.6 * u * Math.SQRT2;
  context.beginPath();
  for (let x = -h; x < w + h; x += step) {
    context.moveTo(x, 0);
    context.lineTo(x + h, h);
  }
  context.stroke();
  context.restore();
}

/** Every 8th pixel of every 8th row from `top` to `bottom`, across the whole width. */
function samplesOf(
  context: CanvasRenderingContext2D,
  w: number,
  top: number,
  bottom: number,
): Rgb[] {
  if (bottom <= top) return [];
  const { data } = context.getImageData(0, top, w, bottom - top);
  const samples: Rgb[] = [];
  for (let row = 0; row < bottom - top; row += 8) {
    for (let x = 0; x < w; x += 8) {
      const i = (row * w + x) * 4;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return samples;
}

/** `colour` at `alpha`, as an `rgb()` the canvas understands. */
function withAlpha(context: CanvasRenderingContext2D, colour: string, alpha: number): string {
  const [r, g, b] = rgbOf(context, colour);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
