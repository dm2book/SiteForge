import { z } from 'zod';
import { FONT_STACK_VALUES } from '@/themes/fonts';

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

/* ── Waardecontroles ──────────────────────────────────────────────────────
   Sommige velden komen niet als tekst op het scherm maar als CSS-waarde in de
   pagina. Daar is "het is een string" niet genoeg: dan mag er ook
   `url(https://iemand-anders/pixel.png)` in, en dat is een verzoek naar een
   vreemde server bij elke bezoeker. Deze controles laten alleen vormen door
   die écht een kleur of een link zijn.                                      */

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d{1,4})\s*)?\)$/;

/** Een kleur is hexadecimaal of een rgb()/rgba() met getallen binnen bereik. */
export function isColorValue(value: string): boolean {
  if (HEX_COLOR.test(value)) return true;
  const m = RGB_COLOR.exec(value);
  if (!m) return false;
  return [m[1], m[2], m[3]].every((n) => Number(n) <= 255);
}

const ColorSchema = z.string().max(32).refine(isColorValue, {
  error: 'Geen geldige kleur. Gebruik #rrggbb, #rgb, #rrggbbaa, rgb(r, g, b) of rgba(r, g, b, a).',
});

/**
 * Waarom een link veilig is, of waarom niet.
 *
 * Teruggegeven als tekst in plaats van alleen true/false, zodat het AI-model
 * straks kan lezen wát er mis was en het in één keer goed kan doen.
 *
 * Geweigerd worden onder andere:
 *  - `javascript:` en `data:` — code vermomd als link;
 *  - `//ergens-anders.nl` en `/\ergens-anders.nl` — die beginnen met een `/`
 *    maar verlaten je site; browsers lezen `/\` als `//`;
 *  - `http://` zonder s — een gepubliceerde site hoort niet naar onversleutelde
 *    pagina's te linken;
 *  - inloggegevens in de URL (`https://user:pw@…`).
 */
export function checkHref(value: string): { ok: true } | { ok: false; reason: string } {
  if (value !== value.trim())
    return { ok: false, reason: 'Een link mag niet met spaties beginnen of eindigen.' };
  if (/[\u0000-\u001f\u007f]/.test(value))
    return { ok: false, reason: 'Een link mag geen stuurtekens bevatten.' };

  if (value.startsWith('#')) {
    return /^#[a-z][a-z0-9-]*$/i.test(value)
      ? { ok: true }
      : { ok: false, reason: 'Een anker verwijst naar een blok-id: #kleine-letters-en-streepjes.' };
  }

  if (value.startsWith('/')) {
    if (value.startsWith('//')) {
      return {
        ok: false,
        reason:
          'Een link die met // begint gaat naar een andere website, niet naar een pagina op deze site.',
      };
    }
    if (value.includes('\\')) {
      return {
        ok: false,
        reason: 'Een interne link mag geen backslash bevatten; browsers lezen /\\ als //.',
      };
    }
    return { ok: true };
  }

  const scheme = value.slice(0, value.indexOf(':') + 1).toLowerCase();

  if (scheme === 'https:') {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, reason: 'Dit is geen complete webadres.' };
    }
    if (url.username || url.password)
      return { ok: false, reason: 'Een link mag geen inloggegevens bevatten.' };
    if (!url.hostname.includes('.'))
      return { ok: false, reason: 'Het webadres mist een geldige domeinnaam.' };
    return { ok: true };
  }

  if (scheme === 'mailto:') {
    return /^mailto:[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(value)
      ? { ok: true }
      : { ok: false, reason: 'Gebruik mailto: met één volledig e-mailadres.' };
  }

  if (scheme === 'tel:') {
    return /^tel:\+?[0-9][0-9 ().-]{3,}$/i.test(value)
      ? { ok: true }
      : {
          ok: false,
          reason: 'Gebruik tel: met een telefoonnummer, bijvoorbeeld tel:+31201234567.',
        };
  }

  return {
    ok: false,
    reason:
      'Alleen een pad op deze site (/…), een anker (#…), https://, mailto: of tel: is toegestaan.',
  };
}

/* ── Thema ────────────────────────────────────────────────────────────────
   Een thema bevat ALLEEN ontwerp-variabelen, nooit componenten en nooit
   klassenamen. De renderer zet ze om in CSS-variabelen. Daardoor kan één set
   componenten er per klant totaal anders uitzien.

   Kleuren moeten een kleur zijn en lettertypen komen uit `themes/fonts.ts`.
   Zo kan er via een thema geen CSS binnenkomen die wij niet geschreven hebben. */

export const ThemeSchema = z
  .object({
    colorBg: ColorSchema,
    colorSurface: ColorSchema,
    colorSurfaceRaised: ColorSchema,
    colorInk: ColorSchema,
    colorInkMuted: ColorSchema,
    colorAccent: ColorSchema,
    colorAccentInk: ColorSchema,
    colorBorder: ColorSchema,
    fontHeading: z.enum(FONT_STACK_VALUES, {
      error: 'Onbekend lettertype. Kies er een uit themes/fonts.ts.',
    }),
    fontBody: z.enum(FONT_STACK_VALUES, {
      error: 'Onbekend lettertype. Kies er een uit themes/fonts.ts.',
    }),
    /** Hoekafronding in pixels. 0 = strak, 24 = zacht. */
    radius: z.number().int().min(0).max(32),
    /** Breedte van de inhoud in pixels. */
    maxWidth: z.number().int().min(800).max(1600),
  })
  .strict();
export type Theme = z.infer<typeof ThemeSchema>;

/* ── Gedeelde bouwstenen ─────────────────────────────────────────────────── */

/**
 * Een knop. `href` gaat door `checkHref` hierboven.
 *
 * De vorige versie keek alleen naar het begin van de tekst met één reguliere
 * expressie. Daar glipten `//ergens-anders.nl` en `/\\ergens-anders.nl` doorheen:
 * die beginnen met een `/`, maar sturen de bezoeker van je site af.
 */
export const ActionSchema = z
  .object({
    label: z.string().min(1).max(40),
    href: z
      .string()
      .min(1)
      .max(300)
      .superRefine((v, ctx) => {
        const verdict = checkHref(v);
        if (!verdict.ok) ctx.addIssue({ code: 'custom', message: verdict.reason });
      }),
  })
  .strict();
export type Action = z.infer<typeof ActionSchema>;

/**
 * Een afbeelding. In deze eerste stap zijn er nog geen uploads, dus tekenen we
 * een nette plaatsvervanger op basis van `seed`. `alt` is verplicht — een
 * afbeelding zonder alternatieve tekst is ontoegankelijk, dus het schema staat
 * het niet toe.
 */
export const MediaSchema = z
  .object({
    kind: z.enum(['placeholder']),
    seed: z.number().int().min(0).max(9999),
    tone: z.enum(['dark', 'accent', 'neutral']).default('dark'),
    alt: z.string().min(3).max(160),
  })
  .strict();
export type Media = z.infer<typeof MediaSchema>;

/* ── Blokken ──────────────────────────────────────────────────────────────
   Elk bloktype krijgt zijn eigen schema. Nieuwe velden mogen erbij; bestaande
   velden veranderen nooit van betekenis. Moet een blok echt anders worden, dan
   komt er een nieuw type (`hero2`) naast het oude. Zo blijven gepubliceerde
   sites renderen.                                                           */

/**
 * Het id van een blok is ook het anker waar een knop naartoe kan wijzen
 * (`href: '#boeken'`), en het komt als `id` in de HTML terecht. Daarom geen
 * vrije tekst maar een slug: kleine letters, cijfers en streepjes.
 */
const BlockIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/, 'Een blok-id bestaat uit kleine letters, cijfers en streepjes.');

const base = { id: BlockIdSchema };

export const HeroBlock = z
  .object({
    ...base,
    type: z.literal('hero'),
    eyebrow: z.string().max(60).optional(),
    headline: z.string().min(1).max(90),
    lead: z.string().max(260).optional(),
    note: z.string().max(80).optional(),
    primary: ActionSchema.optional(),
    secondary: ActionSchema.optional(),
    media: MediaSchema,
  })
  .strict();

export const StatsBlock = z
  .object({
    ...base,
    type: z.literal('stats'),
    items: z
      .array(z.strictObject({ value: z.string().min(1).max(16), label: z.string().min(1).max(40) }))
      .min(2)
      .max(4),
  })
  .strict();

export const ServicesBlock = z
  .object({
    ...base,
    type: z.literal('services'),
    eyebrow: z.string().max(60).optional(),
    heading: z.string().min(1).max(80),
    intro: z.string().max(240).optional(),
    items: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(60),
          description: z.string().max(180).optional(),
          price: z.string().max(16).optional(),
          duration: z.string().max(24).optional(),
        }),
      )
      .min(1)
      .max(12),
  })
  .strict();

export const GalleryBlock = z
  .object({
    ...base,
    type: z.literal('gallery'),
    eyebrow: z.string().max(60).optional(),
    heading: z.string().min(1).max(80),
    intro: z.string().max(240).optional(),
    items: z
      .array(z.strictObject({ media: MediaSchema, caption: z.string().max(60).optional() }))
      .min(2)
      .max(12),
  })
  .strict();

export const TeamBlock = z
  .object({
    ...base,
    type: z.literal('team'),
    eyebrow: z.string().max(60).optional(),
    heading: z.string().min(1).max(80),
    intro: z.string().max(240).optional(),
    members: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(50),
          role: z.string().max(60).optional(),
          bio: z.string().max(200).optional(),
          media: MediaSchema,
        }),
      )
      .min(1)
      .max(8),
  })
  .strict();

export const TestimonialsBlock = z
  .object({
    ...base,
    type: z.literal('testimonials'),
    heading: z.string().min(1).max(80),
    items: z
      .array(
        z.strictObject({
          quote: z.string().min(1).max(280),
          author: z.string().min(1).max(50),
          meta: z.string().max(60).optional(),
        }),
      )
      .min(1)
      .max(6),
  })
  .strict();

export const HoursBlock = z
  .object({
    ...base,
    type: z.literal('hours'),
    heading: z.string().min(1).max(80),
    address: z.string().max(140).optional(),
    phone: z.string().max(40).optional(),
    note: z.string().max(160).optional(),
    rows: z
      .array(z.strictObject({ day: z.string().min(1).max(30), hours: z.string().min(1).max(30) }))
      .min(1)
      .max(7),
  })
  .strict();

export const CtaBlock = z
  .object({
    ...base,
    type: z.literal('cta'),
    heading: z.string().min(1).max(80),
    lead: z.string().max(200).optional(),
    primary: ActionSchema.optional(),
    note: z.string().max(80).optional(),
  })
  .strict();

export const FooterBlock = z
  .object({
    ...base,
    type: z.literal('footer'),
    businessName: z.string().min(1).max(60),
    tagline: z.string().max(100).optional(),
    address: z.string().max(140).optional(),
    phone: z.string().max(40).optional(),
  })
  .strict();

/** De bloktypes, als platte lijst. De compileercontrole staat onder `Block`. */
const BLOCK_TYPE_REGISTRY = {
  hero: true,
  stats: true,
  services: true,
  gallery: true,
  team: true,
  testimonials: true,
  hours: true,
  cta: true,
  footer: true,
} as const;

/**
 * De lijst van alles wat een pagina mag bevatten.
 *
 * `discriminatedUnion` op `type` is precies de poort uit de architectuur: een
 * waarde met `type: "iets-anders"` valideert niet en komt er dus niet door.
 */
export const BlockSchema = z.discriminatedUnion(
  'type',
  [
    HeroBlock,
    StatsBlock,
    ServicesBlock,
    GalleryBlock,
    TeamBlock,
    TestimonialsBlock,
    HoursBlock,
    CtaBlock,
    FooterBlock,
  ],
  {
    /* De standaardmelding is "Invalid input". Die helpt niemand, en straks moet
       een AI-model aan de foutmelding genoeg hebben om het in één keer goed te
       doen. Daarom staan de toegestane types erbij. */
    error: () =>
      `Onbekend bloktype. Toegestaan zijn: ${Object.keys(BLOCK_TYPE_REGISTRY).join(', ')}.`,
  },
);
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block['type'];

/**
 * Alle toegestane bloktypes — dit is wat het AI-model later te zien krijgt.
 *
 * `BLOCK_TYPE_CHECK` hieronder is de compileercontrole: die regel kent het type
 * `Record<BlockType, true>` toe, dus vergeet je hier een bloktype dat wél in de
 * union staat, dan compileert het project niet. Eerder kreeg het model dat blok
 * gewoon nooit te zien, zonder dat iets klaagde.
 *
 * De registry staat met opzet BOVEN `BlockSchema` en zonder type-annotatie: de
 * foutmelding van de union leest hem, en met een annotatie zou er een kring
 * ontstaan (BlockSchema → registry → BlockType → Block → BlockSchema), waardoor
 * TypeScript alle bloktypes stilletjes als `any` zou afdoen.
 */
const BLOCK_TYPE_CHECK: Record<BlockType, true> = BLOCK_TYPE_REGISTRY;

export const BLOCK_TYPES = Object.keys(BLOCK_TYPE_CHECK) as [BlockType, ...BlockType[]];

export function isBlockType(value: string): value is BlockType {
  return value in BLOCK_TYPE_CHECK;
}

/* ── De hele website ──────────────────────────────────────────────────────── */

/**
 * De grenzen van de tekstvelden in `meta`, ook bruikbaar buiten het schema.
 *
 * Een template moet weten hoeveel ruimte het heeft VOORDAT het een zin bouwt.
 * Stond dit alleen in het schema, dan blijft het raden en loopt de titel pas
 * bij een lange bedrijfsnaam over — wat precies de fout was die deze fase
 * oplost. `templates/text.ts` rekent hiermee.
 */
export const META_LIMITS = {
  businessName: 60,
  city: 60,
  title: 60,
  description: 155,
} as const;

export const SiteConfigSchema = z
  .object({
    /** Verhoog dit als het formaat verandert, zodat oude sites te herkennen zijn. */
    schemaVersion: z.literal(1),
    meta: z
      .object({
        businessName: z.string().min(1).max(META_LIMITS.businessName),
        city: z.string().max(META_LIMITS.city).optional(),
        title: z.string().min(1).max(META_LIMITS.title),
        description: z.string().min(1).max(META_LIMITS.description),
        locale: z
          .string()
          .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Gebruik een taalcode als "nl" of "nl-BE".')
          .default('nl'),
      })
      .strict(),
    theme: ThemeSchema,
    blocks: z.array(BlockSchema).min(1).max(30),
  })
  .strict()
  .superRefine((config, ctx) => {
    /* ── Regels over het GEHEEL ────────────────────────────────────────────
       De controles hierboven kijken elk naar één veld. Deze twee kijken naar
       de pagina als geheel. Met een handgeschreven template zijn ze overbodig;
       met een AI die JSON produceert zijn ze het verschil tussen "valt op in
       de test" en "valt op bij een klant". */

    // 1. Ieder blok-id komt één keer voor. Een id is ook een anker (#boeken) en
    //    een `key` voor React; twee keer hetzelfde id betekent dat een anker
    //    naar de verkeerde sectie springt.
    const seen = new Map<string, number>();
    config.blocks.forEach((block, index) => {
      const first = seen.get(block.id);
      if (first === undefined) {
        seen.set(block.id, index);
      } else {
        ctx.addIssue({
          code: 'custom',
          path: ['blocks', index, 'id'],
          message: `Het id "${block.id}" is al gebruikt door blok ${first + 1}. Elk blok heeft een eigen id.`,
        });
      }
    });

    // 2. Precies één hero. De hero levert de <h1> van de pagina; twee heroes
    //    geven twee <h1>'s (slecht voor schermlezers en voor Google), nul
    //    geeft een pagina zonder hoofdkop.
    const heroes = config.blocks.filter((b) => b.type === 'hero').length;
    if (heroes !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['blocks'],
        message:
          heroes === 0
            ? 'Een website begint met precies één hero-blok; die levert de <h1>.'
            : `Er zijn ${heroes} hero-blokken. Een website heeft er precies één, want de hero levert de <h1>.`,
      });
    }

    // 3. Een anker (#…) moet naar een blok wijzen dat bestaat. Een knop die
    //    nergens heen springt is voor een bezoeker een kapotte knop.
    const ids = new Set(config.blocks.map((b) => b.id));
    config.blocks.forEach((block, index) => {
      for (const key of ['primary', 'secondary'] as const) {
        const action = (block as Record<string, unknown>)[key] as { href?: string } | undefined;
        const href = action?.href;
        if (href?.startsWith('#') && !ids.has(href.slice(1))) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', index, key, 'href'],
            message: `"${href}" verwijst naar een blok dat niet bestaat. Bestaande ids: ${[...ids].join(', ')}.`,
          });
        }
      }
    });
  });
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/**
 * De enige manier waarop een configuratie het systeem binnenkomt.
 *
 * Geeft nooit een uitzondering terug maar een resultaat, zodat de aanroeper
 * gedwongen wordt na te denken over de foutsituatie. De foutmeldingen zijn
 * leesbaar bedoeld: ze komen straks in de editor naast het veld te staan.
 */
export type ConfigError = {
  /** Waar in de configuratie, bijvoorbeeld `blocks.2.primary.href`. */
  path: string;
  /** Wat er mis is, in gewone taal. */
  message: string;
  /** Het soort fout van Zod, bijvoorbeeld `unrecognized_keys` of `too_big`. */
  code: string;
};

export type ParseResult = { ok: true; config: SiteConfig } | { ok: false; errors: ConfigError[] };

export function parseSiteConfig(input: unknown): ParseResult {
  const result = SiteConfigSchema.safeParse(input);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
      code: i.code,
    })),
  };
}

/**
 * Dezelfde fouten als één tekstblok, voor een logregel of voor het terugsturen
 * naar een AI-model dat zijn antwoord moet verbeteren.
 */
export function formatConfigErrors(errors: ConfigError[]): string {
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n');
}
