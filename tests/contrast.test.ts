import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, type ThemeId } from '@/themes/presets';
import type { Theme } from '@/site/schema';
import { contrast, round } from './helpers/contrast';

/**
 * Leesbaarheid als test in plaats van als goed voornemen.
 *
 * WCAG AA vraagt 4,5:1 voor gewone tekst en 3:1 voor grafische elementen.
 * Bij de vorige review bleek de witte knoptekst in het thema steel-fade op
 * 3,68:1 te staan en de hulptekst in de interface op 2,71:1. Zulke dingen zie
 * je niet door ernaar te kijken — je moet ze rekenen. Nu rekent de test mee,
 * dus een nieuwe kleur die te licht of te donker is laat de build struikelen.
 */

describe('de rekenmethode zelf klopt', () => {
  it('kent de bekende uitersten', () => {
    expect(round(contrast('#000000', '#ffffff'))).toBe(21);
    expect(round(contrast('#ffffff', '#ffffff'))).toBe(1);
  });

  it('bevestigt de twee waarden uit de review', () => {
    // Dit waren de gemeten fouten; ze staan hier als ijkpunt.
    expect(round(contrast('#ffffff', '#e2574c'))).toBeCloseTo(3.68, 1);
    expect(round(contrast('#555566', '#0a0a0f'))).toBeCloseTo(2.71, 1);
  });
});

/**
 * De combinaties die in site.css werkelijk voorkomen. Alleen die testen we —
 * een eis stellen aan een combinatie die nergens op het scherm staat, dwingt
 * ontwerpkeuzes af zonder dat iemand er iets aan heeft.
 */
const TEKSTPAREN: [keyof Theme, keyof Theme, string][] = [
  ['colorInk', 'colorBg', 'gewone tekst op de achtergrond'],
  ['colorInk', 'colorSurface', 'tekst in een band'],
  ['colorInk', 'colorSurfaceRaised', 'tekst in het notitieblokje en de cta'],
  ['colorInkMuted', 'colorBg', 'ingetogen tekst (lead, intro, adres)'],
  ['colorInkMuted', 'colorSurface', 'ingetogen tekst in een band'],
  ['colorInkMuted', 'colorSurfaceRaised', 'ingetogen tekst in de cta'],
  ['colorAccent', 'colorBg', 'bovenkopje in accentkleur'],
  ['colorAccent', 'colorSurface', 'bovenkopje in een band'],
  ['colorAccentInk', 'colorAccent', 'opschrift van de hoofdknop'],
];

describe('contrast in de gegenereerde klantsites', () => {
  for (const id of Object.keys(THEMES) as ThemeId[]) {
    const theme = THEMES[id];
    for (const [voor, achter, wat] of TEKSTPAREN) {
      it(`${id}: ${wat} haalt 4,5:1`, () => {
        const v = contrast(theme[voor] as string, theme[achter] as string);
        expect(round(v), `${voor} op ${achter} = ${round(v)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }

    it(`${id}: het accentstipje haalt 3:1 als grafisch element`, () => {
      const v = contrast(theme.colorAccent, theme.colorSurfaceRaised);
      expect(round(v)).toBeGreaterThanOrEqual(3);
    });
  }
});

/**
 * De interface van SiteForge zelf. De kleuren komen rechtstreeks uit
 * globals.css, zodat de test meekijkt met het echte bestand en niet met een
 * kopie die kan verouderen.
 */
function leesKleuren(): Record<string, string> {
  const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

describe('contrast in de SiteForge-interface', () => {
  const c = leesKleuren();
  const vlakken = ['bg-0', 'bg-1', 'bg-2'];

  it('vindt de kleuren in globals.css', () => {
    for (const naam of ['ink', 'muted', 'faint', 'brand', 'brand-strong', 'brand-2', ...vlakken]) {
      expect(c[naam], `--color-${naam} ontbreekt`).toBeTruthy();
    }
  });

  for (const tekst of ['ink', 'muted', 'faint']) {
    for (const vlak of vlakken) {
      it(`${tekst} op ${vlak} haalt 4,5:1`, () => {
        const v = contrast(c[tekst], c[vlak]);
        expect(round(v), `${round(v)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('de merkkleur blijft leesbaar als tekst', () => {
    expect(round(contrast(c['brand'], c['bg-0']))).toBeGreaterThanOrEqual(4.5);
  });

  it('witte knoptekst haalt 4,5:1, zowel normaal als bij hover', () => {
    expect(round(contrast('#ffffff', c['brand-strong'])), 'knopvlak').toBeGreaterThanOrEqual(4.5);
    expect(round(contrast('#ffffff', c['brand-2'])), 'hover').toBeGreaterThanOrEqual(4.5);
  });

  it('de focusrand is als grafisch element te onderscheiden van de achtergrond', () => {
    for (const vlak of vlakken) {
      expect(round(contrast(c['brand'], c[vlak])), vlak).toBeGreaterThanOrEqual(3);
    }
  });
});
