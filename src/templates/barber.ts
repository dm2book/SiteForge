import type { Brief } from '@/lib/brief';
import { THEMES } from '@/themes/presets';
import { META_LIMITS, type SiteConfig } from '@/site/schema';
import { fit } from './text';

/**
 * Het barbier-template.
 *
 * Een template is géén AI. Het is onze eigen vakkennis, vastgelegd: welke
 * secties een kapperszaak nodig heeft, in welke volgorde, en met wat voor soort
 * teksten. Dit is de waarde van SiteForge — het AI-model vult hier straks de
 * teksten in, maar de STRUCTUUR komt altijd hiervandaan.
 *
 * De teksten hieronder zijn met opzet concreet ("inloop vóór 11.00", "45
 * minuten") in plaats van vaag ("kwaliteit en service"). Vage marketingtaal is
 * het duidelijkste teken van een automatisch gemaakte website, en dat is precies
 * wat we willen vermijden.
 */
export function buildBarberSite(brief: Brief): SiteConfig {
  const name = brief.businessName.trim();
  const city = (brief.city || '').trim();
  const since = (brief.since || '').trim();
  /* Geen cast en geen terugval meer nodig: het schema garandeert dat
     `brief.theme` een bestaand thema is. */
  const theme = THEMES[brief.theme];

  const place = city ? `${city}` : 'de stad';
  const sinceLine = since ? `Skin fades sinds ${since}.` : 'Vakwerk, elke dag opnieuw.';

  /* ── Teksten die de naam van de klant bevatten ───────────────────────────
     Deze velden hebben een limiet in het schema en krijgen er een naam van
     maximaal 60 tekens bij. Vroeger werd de zin gewoon samengeplakt en liep
     hij over: bij een naam van 38 tekens plus "Amsterdam" werd de titel 61
     tekens, keurde het schema de configuratie af en kreeg de bezoeker een
     serverfout. `fit` kiest nu de rijkste variant die nog past. Wat wegvalt
     is onze eigen toevoeging, nooit de naam van de zaak. */

  const title = fit(META_LIMITS.title, [
    city ? `${name} — Barbier in ${city}` : `${name} — Barbier`,
    `${name} — Barbier`,
    name,
  ]);

  const description = fit(META_LIMITS.description, [
    `${name} knipt in ${place}: skin fades, schaarwerk en hot-towel shaves. ` +
      `Online een stoel boeken of inlopen vóór 11.00.`,
    `${name} knipt in ${place}: skin fades, schaarwerk en hot-towel shaves.`,
    `${name}: skin fades, schaarwerk en hot-towel shaves.`,
  ]);

  const heroEyebrow = fit(60, [city ? `${city} · Barbier` : 'Barbier', city, 'Barbier']);

  return {
    schemaVersion: 1,
    meta: {
      businessName: name,
      city: city || undefined,
      title,
      description,
      locale: 'nl',
    },
    theme,
    blocks: [
      {
        id: 'hero',
        type: 'hero',
        eyebrow: heroEyebrow,
        headline: 'Een nette knipbeurt, op de dag dat het uitkomt.',
        lead: `${sinceLine} Boek de stoel die je wilt, of loop binnen vóór 11.00 — dan neemt de eerste vrije stoel je mee.`,
        note: 'Vandaag nog plek om 14.40',
        primary: { label: 'Boek een stoel', href: '#boeken' },
        secondary: { label: 'Bekijk het werk', href: '#werk' },
        media: { kind: 'placeholder', seed: 11, tone: 'dark', alt: 'Plaatsvervangende foto — vervang door een foto van je zaak' },
      },
      {
        id: 'stats',
        type: 'stats',
        items: [
          { value: since || '2011', label: 'Sinds' },
          { value: '45 min', label: 'Standaard knipbeurt' },
          { value: '4', label: 'Stoelen' },
          { value: '11.00', label: 'Inloop tot' },
        ],
      },
      {
        id: 'werk',
        type: 'gallery',
        eyebrow: 'Het werk',
        heading: 'Recent geknipt',
        intro:
          'Elke foto is werk uit deze zaak van de afgelopen maand. Laat gerust een schermafbeelding zien van wat je wilt.',
        items: [
          { media: { kind: 'placeholder', seed: 21, tone: 'dark', alt: 'Plaatsvervangende foto van een mid skin fade' }, caption: 'Mid skin fade' },
          { media: { kind: 'placeholder', seed: 22, tone: 'accent', alt: 'Plaatsvervangende foto van schaarwerk' }, caption: 'Schaarwerk' },
          { media: { kind: 'placeholder', seed: 23, tone: 'neutral', alt: 'Plaatsvervangende foto van een klassieke zijscheiding' }, caption: 'Klassieke zijscheiding' },
          { media: { kind: 'placeholder', seed: 24, tone: 'dark', alt: 'Plaatsvervangende foto van een baard bijwerken' }, caption: 'Baard bijwerken' },
          { media: { kind: 'placeholder', seed: 25, tone: 'accent', alt: 'Plaatsvervangende foto van een burst fade' }, caption: 'Burst fade' },
          { media: { kind: 'placeholder', seed: 26, tone: 'neutral', alt: 'Plaatsvervangende foto van een hot-towel shave' }, caption: 'Hot-towel shave' },
        ],
      },
      {
        id: 'diensten',
        type: 'services',
        eyebrow: 'Prijzen',
        heading: 'Wat dingen kosten',
        intro: 'Geen verborgen kosten. Contant en pin allebei prima.',
        items: [
          { name: 'Knippen', description: 'Wassen, knippen en afwerken.', price: '€38', duration: '45 min' },
          { name: 'Skin fade', description: 'Tot op de huid, met de hand uitgewerkt.', price: '€42', duration: '45 min' },
          { name: 'Knippen en baard', description: 'Volledige knipbeurt plus baard in model.', price: '€58', duration: '60 min' },
          { name: 'Hot-towel shave', description: 'Traditioneel met het mes, twee doeken.', price: '€45', duration: '45 min' },
          { name: 'Onder 12 jaar', description: 'Elke knipbeurt, geen haast.', price: '€25', duration: '30 min' },
        ],
      },
      {
        id: 'team',
        type: 'team',
        eyebrow: 'De barbiers',
        heading: 'Wie je kunt boeken',
        intro: 'Iedereen knipt alles, maar we hebben onze voorkeuren. Kies daarop.',
        members: [
          {
            name: 'Barbier 1',
            role: 'Fades en tondeusewerk',
            bio: 'Vervang deze tekst door een korte beschrijving van je eerste barbier.',
            media: { kind: 'placeholder', seed: 31, tone: 'dark', alt: 'Plaatsvervangend portret van een barbier' },
          },
          {
            name: 'Barbier 2',
            role: 'Schaarwerk',
            bio: 'Vervang deze tekst door een korte beschrijving van je tweede barbier.',
            media: { kind: 'placeholder', seed: 32, tone: 'neutral', alt: 'Plaatsvervangend portret van een barbier' },
          },
          {
            name: 'Barbier 3',
            role: 'Baarden en shaves',
            bio: 'Vervang deze tekst door een korte beschrijving van je derde barbier.',
            media: { kind: 'placeholder', seed: 33, tone: 'accent', alt: 'Plaatsvervangend portret van een barbier' },
          },
        ],
      },
      {
        id: 'reviews',
        type: 'testimonials',
        heading: 'Wat klanten zeggen',
        items: [
          {
            quote: 'Vervang deze tekst door een echte review. Laat staan tot je er een hebt — verzonnen reviews vallen op.',
            author: 'Naam klant',
            meta: 'Vaste klant',
          },
          {
            quote: 'Een tweede plek voor een echte review. Vraag er gerust om na een knipbeurt.',
            author: 'Naam klant',
            meta: 'Google-review',
          },
        ],
      },
      {
        id: 'openingstijden',
        type: 'hours',
        heading: 'Openingstijden en adres',
        address: city ? `Straatnaam 1, ${city}` : 'Straatnaam 1',
        phone: '+31 6 00000000',
        note: 'Inloop tot 11.00; daarna op afspraak, zodat niemand een uur voor het raam zit.',
        rows: [
          { day: 'Dinsdag t/m vrijdag', hours: '09.00 – 19.00' },
          { day: 'Zaterdag', hours: '08.00 – 17.00' },
          { day: 'Zondag en maandag', hours: 'Gesloten' },
        ],
      },
      {
        id: 'boeken',
        type: 'cta',
        heading: 'De stoel staat klaar.',
        lead: 'Boeken kost een halve minuut. Wijzigen kan tot een uur van tevoren.',
        primary: { label: 'Boek een stoel', href: '#boeken' },
        note: 'Boekingsmodule volgt in een latere versie.',
      },
      {
        id: 'footer',
        type: 'footer',
        businessName: name,
        tagline: fit(100, [city ? `Barbier in ${city}` : 'Barbier', 'Barbier']),
        address: city ? `Straatnaam 1, ${city}` : 'Straatnaam 1',
        phone: '+31 6 00000000',
      },
    ],
  };
}
