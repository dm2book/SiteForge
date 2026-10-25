import { describe, it, expect } from 'vitest';
import { generateMetadata } from '@/app/render/page';

/**
 * Regressietest bij bevinding H1.
 *
 * De gegenereerde site droeg de titel van SiteForge zelf, omdat `config.meta`
 * wél werd berekend maar nooit in de <head> kwam. Deze test roept precies de
 * functie aan die Next daarvoor gebruikt.
 */
const params = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

const geldig = {
  name: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

describe('metadata van de gegenereerde site', () => {
  it('gebruikt de naam van de klant in de titel, niet die van SiteForge', async () => {
    const meta = await generateMetadata(params(geldig));
    expect(meta.title).toContain('Ledger & Blade');
    expect(String(meta.title)).not.toContain('SiteForge');
  });

  it('noemt de plaats in de titel', async () => {
    const meta = await generateMetadata(params(geldig));
    expect(meta.title).toContain('Amsterdam');
  });

  it('zet een eigen omschrijving die binnen de 155 tekens blijft', async () => {
    const meta = await generateMetadata(params(geldig));
    expect(meta.description).toBeTruthy();
    expect(String(meta.description)).toContain('Ledger & Blade');
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
  });

  it('vult ook OpenGraph en Twitter met diezelfde gegevens', async () => {
    const meta = await generateMetadata(params(geldig));
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph).toMatchObject({ siteName: 'Ledger & Blade' });
    expect(meta.twitter?.title).toBe(meta.title);
  });

  it('valt netjes terug bij onbruikbare parameters, zonder iets te verraden', async () => {
    const meta = await generateMetadata(params({ name: '', category: 'barber' }));
    expect(meta.title).toBe('Deze website kan niet worden getoond');
    // Geen binnenwerk in de titel, en niet indexeerbaar.
    expect(String(meta.title)).not.toMatch(/schema|config|Zod|Error/i);
    expect(meta.robots).toMatchObject({ index: false });
  });

  /**
   * Deze test slaagde eerder om de verkeerde reden.
   *
   * De naam hieronder is 54 tekens. Met ", Barbier in Amsterdam" erachter werd
   * de titel 77 tekens, keurde het schema de configuratie af en gaf
   * `generateMetadata` de terugvaltitel "Website niet gevonden" van 21 tekens.
   * Dáárop slaagde de assertie — de test mat de noodrem, niet het template, en
   * daardoor bleef de 500-fout onzichtbaar.
   *
   * Nu eist de test ook dat er een ECHTE titel uitkomt, met de naam van de
   * klant erin.
   */
  it('houdt de titel binnen de 60 tekens én blijft een echte titel, ook bij een lange naam', async () => {
    const naam = 'Een Bijzonder Lange Kapperszaak Met Een Hele Lange Naam';
    const meta = await generateMetadata(params({ ...geldig, name: naam }));
    expect(meta.title).toContain(naam);
    expect(String(meta.title).length).toBeLessThanOrEqual(60);
    expect(meta.title).not.toBe('Deze website kan niet worden getoond');
  });
});
