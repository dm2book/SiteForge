import { describe, it, expect } from 'vitest';
import { fit, truncate } from '@/templates/text';
import { buildSite } from '@/templates';
import { parseSiteConfig, META_LIMITS, formatConfigErrors } from '@/site/schema';
import { THEME_IDS } from '@/themes/presets';
import type { Brief } from '@/lib/brief';

/**
 * Regressietests bij de fout die fase 1 aanleiding gaf.
 *
 * Een bedrijfsnaam van 38 tekens met de plaats "Amsterdam" maakte een titel
 * van 61 tekens. Het schema staat er 60 toe, dus de configuratie werd
 * afgekeurd en /render gaf een HTTP 500 — bij een doodgewone naam als
 * "Barbershop Het Scherpe Mes Amsterdam Oost".
 */
const brief = (over: Partial<Brief> = {}): Brief => ({
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
  ...over,
});

const letters = (n: number) => 'a'.repeat(n);

describe('fit kiest de rijkste variant die past', () => {
  it('neemt de eerste variant als die past', () => {
    expect(fit(20, ['kort', 'korter'])).toBe('kort');
  });

  it('slaat een te lange variant over', () => {
    expect(fit(5, ['veel te lang', 'kort'])).toBe('kort');
  });

  it('kapt alleen af als geen enkele variant past', () => {
    const r = fit(10, ['abcdefghijklmnop']);
    expect(r.length).toBeLessThanOrEqual(10);
    expect(r.endsWith('…')).toBe(true);
  });

  it('slaat een lege variant over in plaats van hem te kiezen', () => {
    expect(fit(20, ['', 'wel iets'])).toBe('wel iets');
  });
});

describe('truncate knipt veilig', () => {
  it('laat tekst die past met rust', () => {
    expect(truncate('precies goed', 20)).toBe('precies goed');
  });

  it('blijft binnen de limiet, inclusief het beletselteken', () => {
    for (const n of [5, 8, 13, 21, 34]) {
      expect(truncate('een hele lange zin die er niet in past', n).length).toBeLessThanOrEqual(n);
    }
  });

  it('knipt een emoji niet doormidden', () => {
    // '💈' is één teken maar telt voor twee in .length — precies zoals Zod telt.
    const value = 'abcd💈efgh';
    for (let n = 2; n <= value.length; n++) {
      const cut = truncate(value, n);
      expect(cut.length).toBeLessThanOrEqual(n);
      // Een los surrogaat levert het vervangingsteken op bij het coderen.
      expect(Buffer.from(cut, 'utf8').toString('utf8')).toBe(cut);
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(cut)).toBe(
        false,
      );
    }
  });

  it('laat geen losse leestekens of spaties achter voor het beletselteken', () => {
    expect(truncate('Barbershop Het Scherpe Mes, Amsterdam', 28)).not.toMatch(/[ ,.;:—-]…$/);
  });
});

describe('het template blijft binnen de limieten van het schema', () => {
  it('reproduceert de oorspronkelijke fout niet meer: 38 tekens plus Amsterdam', () => {
    const naam = letters(38);
    const result = parseSiteConfig(buildSite(brief({ businessName: naam })));
    expect(result.ok, result.ok ? '' : formatConfigErrors(result.errors)).toBe(true);
  });

  it('houdt de echte naam uit de oorspronkelijke melding heel', () => {
    const naam = 'Barbershop Het Scherpe Mes Amsterdam Oost'; // 41 tekens
    const config = buildSite(brief({ businessName: naam }));
    expect(parseSiteConfig(config).ok).toBe(true);
    // De naam van de klant wordt nooit afgekapt; onze eigen opsmuk verdwijnt.
    expect(config.meta.title).toContain(naam);
    expect(config.meta.title.length).toBeLessThanOrEqual(META_LIMITS.title);
  });

  it('laat de naam ook bij de maximale lengte heel', () => {
    const naam = letters(60);
    const config = buildSite(brief({ businessName: naam, city: 'Amsterdam' }));
    expect(config.meta.title).toBe(naam);
    expect(config.meta.businessName).toBe(naam);
    expect(parseSiteConfig(config).ok).toBe(true);
  });

  it('gebruikt de plaats zolang die past en laat hem anders weg', () => {
    const kort = buildSite(brief({ businessName: 'Kapper', city: 'Amsterdam' }));
    expect(kort.meta.title).toBe('Kapper — Barbier in Amsterdam');

    const lang = buildSite(brief({ businessName: letters(45), city: 'Amsterdam' }));
    expect(lang.meta.title).not.toContain('Amsterdam');
    expect(lang.meta.title).toContain('Barbier');
  });

  /**
   * De domeintest. Dit is de test die de oorspronkelijke fout gevangen zou
   * hebben: niet één voorbeeld, maar élke combinatie die het formulier toelaat.
   */
  it('levert voor élke toegestane naam- en plaatslengte een geldige configuratie', () => {
    const problemen: string[] = [];
    for (let n = 2; n <= 60; n++) {
      for (const c of [0, 1, 2, 9, 20, 33, 46, 59, 60]) {
        const config = buildSite(brief({ businessName: letters(n), city: letters(c) }));
        const parsed = parseSiteConfig(config);
        if (!parsed.ok) problemen.push(`naam ${n}, plaats ${c}: ${formatConfigErrors(parsed.errors)}`);
      }
    }
    expect(problemen, problemen.slice(0, 5).join(' | ')).toHaveLength(0);
  });

  it('doet dat ook zonder plaats, zonder jaartal en bij elk thema', () => {
    const problemen: string[] = [];
    for (let n = 2; n <= 60; n++) {
      for (const theme of THEME_IDS) {
        for (const since of ['', '2011']) {
          const config = buildSite(brief({ businessName: letters(n), city: '', since, theme }));
          const parsed = parseSiteConfig(config);
          if (!parsed.ok) problemen.push(`naam ${n}, ${theme}: ${formatConfigErrors(parsed.errors)}`);
        }
      }
    }
    expect(problemen, problemen.slice(0, 5).join(' | ')).toHaveLength(0);
  });

  it('blijft geldig bij namen met emoji en niet-Latijns schrift', () => {
    for (const naam of ['💈'.repeat(25), 'حلاق'.repeat(12), 'Ædnan & Søn — Barbier', '  Kapper  ']) {
      const parsed = parseSiteConfig(buildSite(brief({ businessName: naam.trim() })));
      expect(parsed.ok, `${naam}: ${parsed.ok ? '' : formatConfigErrors(parsed.errors)}`).toBe(true);
    }
  });
});
