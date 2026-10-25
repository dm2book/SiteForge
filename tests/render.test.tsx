import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteRenderer } from '@/site/SiteRenderer';
import { buildSite } from '@/templates';
import { parseSiteConfig } from '@/site/schema';
import { THEME_IDS } from '@/themes/presets';
import { contrast, round } from './helpers/contrast';
import type { Brief } from '@/lib/brief';

const brief: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

function renderSite(over: Partial<Brief> = {}) {
  const parsed = parseSiteConfig(buildSite({ ...brief, ...over }));
  if (!parsed.ok) throw new Error('configuratie ongeldig in test');
  return render(<SiteRenderer config={parsed.config} />);
}

describe('de renderer', () => {
  it('tekent de site zonder te crashen', () => {
    const { container } = renderSite();
    expect(container.querySelector('.sf-site')).not.toBeNull();
  });

  it('heeft precies één h1', () => {
    renderSite();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('geeft elke afbeelding een toegankelijke naam', () => {
    renderSite();
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(2);
    }
  });

  it('zet het thema om in CSS-variabelen', () => {
    const { container } = renderSite();
    const root = container.querySelector('.sf-site') as HTMLElement;
    expect(root.style.getPropertyValue('--sf-accent')).toBe('#c9a227');
  });

  /* Bevinding A4 uit de tweede review: de gegenereerde klantsite had geen
     <main>. Zonder dat landmark kan iemand met een schermlezer niet in één
     sprong naar de inhoud. */
  it('heeft precies één main-landmark', () => {
    const { container } = renderSite();
    expect(container.querySelectorAll('main')).toHaveLength(1);
  });

  it('laat de footer buiten main staan, want dat is een eigen landmark', () => {
    const { container } = renderSite();
    const main = container.querySelector('main')!;
    expect(main.querySelector('.sf-footer')).toBeNull();
    expect(container.querySelector('.sf-footer')).not.toBeNull();
  });

  /* Bevinding A5: in een <dl> hoort de term vóór de beschrijving. Het stond
     omgekeerd, zodat het getal bovenaan kwam; dat doet nu CSS. */
  it('zet in de statistieken de term vóór de waarde', () => {
    const { container } = renderSite();
    const eerste = container.querySelector('.sf-stat')!;
    expect([...eerste.children].map((c) => c.tagName)).toEqual(['DT', 'DD']);
  });

  /**
   * Komen de themakleuren werkelijk bij de componenten aan?
   *
   * Let op wat deze test WEL en NIET aantoont. Hij volgt de weg van een
   * themawaarde naar een berekende stijl, dus hij vangt een kapotte of
   * verkeerd gekoppelde CSS-variabele. Hij vangt GÉÉN specificiteitsconflict:
   * happy-dom bootst de cascade maar gedeeltelijk na, en bij een proef bleef
   * deze test groen terwijl Chromium een andere kleur tekende. Daarvoor is
   * `tests/site-css.test.ts`, dat de stylesheet zelf narekent.
   */
  describe('de themakleuren bereiken de componenten', () => {
    for (const theme of THEME_IDS) {
      it(`${theme}: de hoofdknop krijgt de accentkleur en de accent-inkt`, () => {
        const { container } = renderSite({ theme });
        const knop = container.querySelector('.sf-btn-primary') as HTMLElement;
        expect(knop, 'geen hoofdknop gevonden').not.toBeNull();
        const stijl = getComputedStyle(knop);
        const v = contrast(stijl.color, stijl.backgroundColor);
        expect(
          round(v),
          `${stijl.color} op ${stijl.backgroundColor} = ${round(v)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  it('rendert tekst als tekst, nooit als opmaak', () => {
    const parsed = parseSiteConfig(buildSite({ ...brief, businessName: '<script>x</script>Zaak' }));
    if (!parsed.ok) throw new Error('configuratie ongeldig');
    const { container } = render(<SiteRenderer config={parsed.config} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>x</script>Zaak');
  });
});
