/**
 * De lettertypen die een thema mag gebruiken.
 *
 * Dit is met opzet een gesloten lijst en geen vrije tekst. Een thema-waarde
 * belandt rechtstreeks in een CSS-variabele; zou daar willekeurige tekst in
 * mogen, dan is `fontBody` een gaatje waardoor CSS-inhoud naar binnen komt die
 * wij niet geschreven hebben. Met een lijst kiest een thema (en straks het
 * AI-model) alleen uit wat wij vooraf hebben goedgekeurd.
 *
 * Dit bestand importeert niets, zodat zowel het schema als de thema's het
 * kunnen gebruiken zonder importkring.
 *
 * Elke stack eindigt in een systeemlettertype, zodat een site leesbaar blijft
 * als het webfont niet laadt.
 */
export const FONT_STACKS = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  condensed: "'Oswald', 'Arial Narrow', system-ui, sans-serif",
} as const;

export type FontStackId = keyof typeof FONT_STACKS;
export type FontStack = (typeof FONT_STACKS)[FontStackId];

/** De toegestane waarden, als tuple voor `z.enum`. */
export const FONT_STACK_VALUES = Object.values(FONT_STACKS) as [FontStack, ...FontStack[]];
