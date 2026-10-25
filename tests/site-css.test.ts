import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * De stylesheet narekenen in plaats van erop vertrouwen.
 *
 * ── Wat hier fout ging ────────────────────────────────────────────────────
 * `.sf-site a { color: inherit; }` telt één klasse plus één element.
 * `.sf-btn-primary { color: var(--sf-accent-ink); }` telt één klasse. Bij
 * gelijke herkomst wint de hoogste specificiteit, dus de anker-regel won: de
 * knoptekst kreeg de gewone tekstkleur in plaats van de accent-inkt. Op het
 * rode thema was dat lichte tekst op rood — ruim onder de contrasteis.
 *
 * Niet te zien in de stylesheet, niet te zien in de thema-tests (daar klopte
 * alles), en happy-dom liet het ook niet zien: die bootst dit stuk cascade
 * niet na, waardoor een test met `getComputedStyle` groen bleef terwijl
 * Chromium een andere kleur tekende. Gevonden door de knop in een echte
 * browser op te meten.
 *
 * Daarom rekent deze test de specificiteit zelf uit, zonder browser.
 */

/* Zonder commentaar: de regex hieronder leest alles tussen `}` en `{` als
   selector, en een commentaarblok dat klassenamen noemt zou dan meetellen in
   de specificiteit. (Dat gebeurde: de test slaagde daardoor altijd.) */
const css = readFileSync(resolve(process.cwd(), 'src/site/site.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Specificiteit als [ids, klassen, elementen] — genoeg voor deze stylesheet. */
export function specificity(selector: string): [number, number, number] {
  const sel = selector.trim();
  const ids = (sel.match(/#[\w-]+/g) ?? []).length;
  const klassen = (sel.match(/\.[\w-]+/g) ?? []).length + (sel.match(/\[[^\]]+\]/g) ?? []).length;
  const elementen = (sel.replace(/[.#][\w-]+/g, '').match(/\b[a-z][\w-]*\b/g) ?? []).length;
  return [ids, klassen, elementen];
}

const sterker = (a: [number, number, number], b: [number, number, number]) =>
  a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];

/** Alle regels die `color` zetten, in bronvolgorde. */
function kleurRegels(): { selector: string; index: number }[] {
  const uit: { selector: string; index: number }[] = [];
  const regel = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = regel.exec(css))) {
    const body = m[2];
    if (!/(^|[;\s])color\s*:/.test(body)) continue;
    for (const sel of m[1].split(',')) uit.push({ selector: sel.trim(), index: m.index });
  }
  return uit;
}

describe('de cascade in site.css', () => {
  it('vindt de regels die een tekstkleur zetten', () => {
    expect(kleurRegels().length).toBeGreaterThan(3);
  });

  it('laat de hoofdknop zijn eigen tekstkleur houden, ook naast de algemene linkregel', () => {
    const regels = kleurRegels();
    const knop = regels.find((r) => r.selector.includes('.sf-btn-primary'));
    const linkRegels = regels.filter((r) => /(^|\s)a$/.test(r.selector));

    expect(knop, 'geen regel gevonden die .sf-btn-primary een kleur geeft').toBeTruthy();
    expect(linkRegels.length, 'geen algemene linkregel gevonden').toBeGreaterThan(0);

    for (const link of linkRegels) {
      const knopSpec = specificity(knop!.selector);
      const linkSpec = specificity(link.selector);
      const wint =
        sterker(knopSpec, linkSpec) || (!sterker(linkSpec, knopSpec) && knop!.index > link.index);
      expect(
        wint,
        `"${link.selector}" [${linkSpec}] wint van "${knop!.selector}" [${knopSpec}], ` +
          'dus de knoptekst krijgt de verkeerde kleur',
      ).toBe(true);
    }
  });

  it('rekent specificiteit uit zoals een browser dat doet', () => {
    expect(specificity('.sf-btn-primary')).toEqual([0, 1, 0]);
    expect(specificity('.sf-site a')).toEqual([0, 1, 1]);
    expect(specificity('.sf-site .sf-btn-primary')).toEqual([0, 2, 0]);
    expect(sterker([0, 1, 1], [0, 1, 0])).toBe(true);
    expect(sterker([0, 2, 0], [0, 1, 1])).toBe(true);
  });
});
