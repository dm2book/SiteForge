/**
 * Contrastberekening volgens WCAG 2.x, gedeeld door de contrasttests.
 *
 * Staat in `tests/helpers/` zodat vitest het niet als testbestand oppakt
 * (`include` kijkt alleen naar `*.test.ts(x)`).
 */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Begrijpt `#rgb`, `#rrggbb`, `rgb(r, g, b)` en `rgba(r, g, b, a)`. */
export function luminance(color: string): number {
  const rgb = /^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color.trim());
  let r: number, g: number, b: number;
  if (rgb) {
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else {
    let hex = color.trim().replace('#', '').slice(0, 6);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const round = (n: number) => Math.round(n * 100) / 100;
