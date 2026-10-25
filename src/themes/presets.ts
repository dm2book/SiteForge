import type { Theme } from '@/site/schema';
import { FONT_STACKS } from './fonts';

/**
 * Thema's zijn alleen variabelen.
 *
 * Dezelfde blokken met een ander thema geven een visueel andere website. Dat
 * is waarom de AI straks géén kleuren of klassenamen hoeft te kiezen: hij kiest
 * een thema, en de vormgeving blijft van ons.
 *
 * De lettertypen staan als CSS-stack genoteerd met een systeem-fallback, zodat
 * een site ook leesbaar blijft als een webfont niet laadt.
 */

/* De stacks staan in themes/fonts.ts, want het schema laat alleen díé waarden
   toe. Zet je hier een eigen string neer, dan wordt het thema afgekeurd — en
   dat is precies de bedoeling: een lettertype belandt in CSS en is daarmee
   geen vrij tekstveld. */
const { serif: SERIF, sans: SANS, condensed: CONDENSED } = FONT_STACKS;

/** Donker, warm en rustig. Vakmanschap zonder te schreeuwen. */
export const midnightCraft: Theme = {
  colorBg: '#0c0b0a',
  colorSurface: '#151311',
  colorSurfaceRaised: '#1e1b18',
  colorInk: '#f5f1ea',
  colorInkMuted: '#a79e92',
  colorAccent: '#c9a227',
  colorAccentInk: '#17140f',
  colorBorder: 'rgba(245, 241, 234, 0.10)',
  fontHeading: SERIF,
  fontBody: SANS,
  radius: 2,
  maxWidth: 1180,
};

/** Licht, papierachtig en redactioneel. Zelfde blokken, ander gevoel. */
export const linenEditorial: Theme = {
  colorBg: '#faf7f2',
  colorSurface: '#f2ece3',
  colorSurfaceRaised: '#eae2d6',
  colorInk: '#17150f',
  colorInkMuted: '#6b6355',
  colorAccent: '#8a5a3c',
  colorAccentInk: '#ffffff',
  colorBorder: 'rgba(23, 21, 15, 0.12)',
  fontHeading: SERIF,
  fontBody: SANS,
  radius: 4,
  maxWidth: 1140,
};

/** Hard, strak en modern. Voor zaken die eerder stoer dan klassiek zijn. */
export const steelFade: Theme = {
  colorBg: '#0f1113',
  colorSurface: '#171a1d',
  colorSurfaceRaised: '#20252a',
  colorInk: '#eef2f5',
  colorInkMuted: '#95a1ac',
  colorAccent: '#e2574c',
  /* Was wit. Wit op dit rood geeft een contrast van 3,68:1 en zakt daarmee
     onder de WCAG-AA-eis van 4,5:1 voor knoptekst. De accentkleur zelf blijft
     ongewijzigd — alleen de tekst erop is nu donker (5,10:1), net als in
     midnight-craft. Zo blijft het thema herkenbaar en is de knop leesbaar. */
  colorAccentInk: '#1a0f0e',
  colorBorder: 'rgba(238, 242, 245, 0.12)',
  fontHeading: CONDENSED,
  fontBody: SANS,
  radius: 0,
  maxWidth: 1240,
};

export const THEMES = {
  'midnight-craft': midnightCraft,
  'linen-editorial': linenEditorial,
  'steel-fade': steelFade,
} as const;

export type ThemeId = keyof typeof THEMES;

/** Alle thema-ids, zodat het briefschema ze kan valideren in plaats van raden. */
export const THEME_IDS = Object.keys(THEMES) as [ThemeId, ...ThemeId[]];

export function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}

export const THEME_LIST: { id: ThemeId; name: string; description: string }[] = [
  {
    id: 'midnight-craft',
    name: 'Midnight Craft',
    description: 'Donker en warm, met goud. Klassiek vakmanschap.',
  },
  {
    id: 'linen-editorial',
    name: 'Linen Editorial',
    description: 'Licht en redactioneel, als een tijdschrift.',
  },
  {
    id: 'steel-fade',
    name: 'Steel Fade',
    description: 'Strak en stoer, smalle letters, hard contrast.',
  },
];

/** De webfonts die de thema's gebruiken, voor één <link> in de preview. */
export const GOOGLE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&family=Oswald:wght@500;600&display=swap';
