import type { Block, BlockType, Media } from '@/site/schema';

const media: Media = {
  kind: 'placeholder',
  seed: 1,
  tone: 'dark',
  alt: 'Plaatsvervangende afbeelding',
};

/**
 * Eén minimale, geldige instantie van élk bloktype.
 *
 * Het object is getypeerd als `Record<BlockType, Block>`, dus voegt iemand een
 * bloktype toe aan het schema zonder hier een voorbeeld, dan is dat een
 * compilatiefout. Daarmee kan de testsuite nooit stilletjes een bloktype
 * overslaan.
 */
export const MINIMAL_BLOCKS: Record<BlockType, Block> = {
  hero: { id: 'b-hero', type: 'hero', headline: 'Kop', media },
  stats: {
    id: 'b-stats',
    type: 'stats',
    items: [
      { value: '1', label: 'Een' },
      { value: '2', label: 'Twee' },
    ],
  },
  services: {
    id: 'b-services',
    type: 'services',
    heading: 'Diensten',
    items: [{ name: 'Knippen' }],
  },
  gallery: {
    id: 'b-gallery',
    type: 'gallery',
    heading: 'Werk',
    items: [{ media }, { media }],
  },
  team: {
    id: 'b-team',
    type: 'team',
    heading: 'Team',
    members: [{ name: 'Iemand', media }],
  },
  testimonials: {
    id: 'b-testimonials',
    type: 'testimonials',
    heading: 'Reviews',
    items: [{ quote: 'Prima.', author: 'Klant' }],
  },
  hours: {
    id: 'b-hours',
    type: 'hours',
    heading: 'Openingstijden',
    rows: [{ day: 'Maandag', hours: '9–17' }],
  },
  cta: { id: 'b-cta', type: 'cta', heading: 'Kom langs' },
  footer: { id: 'b-footer', type: 'footer', businessName: 'Zaak' },
};
