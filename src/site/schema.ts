import { z } from 'zod';

/**
 * Het contract van een SiteForge-website.
 *
 * Dit bestand is de belangrijkste van het hele project. Alles reist hier
 * doorheen: een template vult het, (later) vult de AI het, de editor bewerkt
 * het, de database bewaart het en de renderer tekent het.
 *
 * De harde regel die dit schema afdwingt:
 *
 *   Een website is DATA, geen code.
 *
 * Er is geen veld waarin HTML, CSS of JavaScript past. Een blok heeft een
 * `type` uit een vaste lijst en velden met gewone tekst of getallen. Verzint
 * iets (of iemand) een nieuw bloktype, dan faalt de validatie en bereikt het
 * nooit een pagina. React zet tekst bovendien standaard als tekst neer, dus
 * `<script>` in een kop verschijnt letterlijk op het scherm in plaats van te
 * draaien.
 */

/* ── Thema ────────────────────────────────────────────────────────────────
   Een thema bevat ALLEEN ontwerp-variabelen, nooit componenten en nooit
   klassenamen. De renderer zet ze om in CSS-variabelen. Daardoor kan één set
   componenten er per klant totaal anders uitzien.                          */

export const ThemeSchema = z.object({
  colorBg: z.string(),
  colorSurface: z.string(),
  colorSurfaceRaised: z.string(),
  colorInk: z.string(),
  colorInkMuted: z.string(),
  colorAccent: z.string(),
  colorAccentInk: z.string(),
  colorBorder: z.string(),
  fontHeading: z.string(),
  fontBody: z.string(),
  /** Hoekafronding in pixels. 0 = strak, 24 = zacht. */
  radius: z.number().int().min(0).max(32),
  /** Breedte van de inhoud in pixels. */
  maxWidth: z.number().int().min(800).max(1600),
});
export type Theme = z.infer<typeof ThemeSchema>;

/* ── Gedeelde bouwstenen ─────────────────────────────────────────────────── */

/** Een knop. `href` mag alleen intern of een veilig protocol zijn. */
export const ActionSchema = z.object({
  label: z.string().min(1).max(40),
  href: z
    .string()
    .min(1)
    .max(300)
    .refine(
      (v) => /^(\/|#|https:\/\/|mailto:|tel:)/.test(v),
      'Alleen interne links, https, mailto of tel zijn toegestaan.',
    ),
});
export type Action = z.infer<typeof ActionSchema>;

/**
 * Een afbeelding. In deze eerste stap zijn er nog geen uploads, dus tekenen we
 * een nette plaatsvervanger op basis van `seed`. `alt` is verplicht — een
 * afbeelding zonder alternatieve tekst is ontoegankelijk, dus het schema staat
 * het niet toe.
 */
export const MediaSchema = z.object({
  kind: z.enum(['placeholder']),
  seed: z.number().int().min(0).max(9999),
  tone: z.enum(['dark', 'accent', 'neutral']).default('dark'),
  alt: z.string().min(3).max(160),
});
export type Media = z.infer<typeof MediaSchema>;

/* ── Blokken ──────────────────────────────────────────────────────────────
   Elk bloktype krijgt zijn eigen schema. Nieuwe velden mogen erbij; bestaande
   velden veranderen nooit van betekenis. Moet een blok echt anders worden, dan
   komt er een nieuw type (`hero2`) naast het oude. Zo blijven gepubliceerde
   sites renderen.                                                           */

const base = { id: z.string().min(1).max(64) };

export const HeroBlock = z.object({
  ...base,
  type: z.literal('hero'),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().min(1).max(90),
  lead: z.string().max(260).optional(),
  note: z.string().max(80).optional(),
  primary: ActionSchema.optional(),
  secondary: ActionSchema.optional(),
  media: MediaSchema,
});

export const StatsBlock = z.object({
  ...base,
  type: z.literal('stats'),
  items: z
    .array(z.object({ value: z.string().min(1).max(16), label: z.string().min(1).max(40) }))
    .min(2)
    .max(4),
});

export const ServicesBlock = z.object({
  ...base,
  type: z.literal('services'),
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(1).max(80),
  intro: z.string().max(240).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        description: z.string().max(180).optional(),
        price: z.string().max(16).optional(),
        duration: z.string().max(24).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const GalleryBlock = z.object({
  ...base,
  type: z.literal('gallery'),
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(1).max(80),
  intro: z.string().max(240).optional(),
  items: z.array(z.object({ media: MediaSchema, caption: z.string().max(60).optional() })).min(2).max(12),
});

export const TeamBlock = z.object({
  ...base,
  type: z.literal('team'),
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(1).max(80),
  intro: z.string().max(240).optional(),
  members: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        role: z.string().max(60).optional(),
        bio: z.string().max(200).optional(),
        media: MediaSchema,
      }),
    )
    .min(1)
    .max(8),
});

export const TestimonialsBlock = z.object({
  ...base,
  type: z.literal('testimonials'),
  heading: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        quote: z.string().min(1).max(280),
        author: z.string().min(1).max(50),
        meta: z.string().max(60).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export const HoursBlock = z.object({
  ...base,
  type: z.literal('hours'),
  heading: z.string().min(1).max(80),
  address: z.string().max(140).optional(),
  phone: z.string().max(40).optional(),
  note: z.string().max(160).optional(),
  rows: z
    .array(z.object({ day: z.string().min(1).max(30), hours: z.string().min(1).max(30) }))
    .min(1)
    .max(7),
});

export const CtaBlock = z.object({
  ...base,
  type: z.literal('cta'),
  heading: z.string().min(1).max(80),
  lead: z.string().max(200).optional(),
  primary: ActionSchema.optional(),
  note: z.string().max(80).optional(),
});

export const FooterBlock = z.object({
  ...base,
  type: z.literal('footer'),
  businessName: z.string().min(1).max(60),
  tagline: z.string().max(100).optional(),
  address: z.string().max(140).optional(),
  phone: z.string().max(40).optional(),
});

/**
 * De lijst van alles wat een pagina mag bevatten.
 *
 * `discriminatedUnion` op `type` is precies de poort uit de architectuur: een
 * waarde met `type: "iets-anders"` valideert niet en komt er dus niet door.
 */
export const BlockSchema = z.discriminatedUnion('type', [
  HeroBlock,
  StatsBlock,
  ServicesBlock,
  GalleryBlock,
  TeamBlock,
  TestimonialsBlock,
  HoursBlock,
  CtaBlock,
  FooterBlock,
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block['type'];

/** Alle toegestane bloktypes — dit is wat het AI-model later te zien krijgt. */
export const BLOCK_TYPES = [
  'hero',
  'stats',
  'services',
  'gallery',
  'team',
  'testimonials',
  'hours',
  'cta',
  'footer',
] as const satisfies readonly BlockType[];

/* ── De hele website ──────────────────────────────────────────────────────── */

export const SiteConfigSchema = z.object({
  /** Verhoog dit als het formaat verandert, zodat oude sites te herkennen zijn. */
  schemaVersion: z.literal(1),
  meta: z.object({
    businessName: z.string().min(1).max(60),
    city: z.string().max(60).optional(),
    title: z.string().min(1).max(60),
    description: z.string().min(1).max(155),
    locale: z.string().min(2).max(5).default('nl'),
  }),
  theme: ThemeSchema,
  blocks: z.array(BlockSchema).min(1).max(30),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/**
 * De enige manier waarop een configuratie het systeem binnenkomt.
 *
 * Geeft nooit een uitzondering terug maar een resultaat, zodat de aanroeper
 * gedwongen wordt na te denken over de foutsituatie. De foutmeldingen zijn
 * leesbaar bedoeld: ze komen straks in de editor naast het veld te staan.
 */
export type ParseResult =
  | { ok: true; config: SiteConfig }
  | { ok: false; errors: { path: string; message: string }[] };

export function parseSiteConfig(input: unknown): ParseResult {
  const result = SiteConfigSchema.safeParse(input);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
    })),
  };
}
