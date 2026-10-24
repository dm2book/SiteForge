import { z } from 'zod';
import {
  CATEGORY_IDS,
  categoryLabel,
  isAvailableCategory,
  isCategoryId,
  type AvailableCategoryId,
  type CategoryId,
} from '@/templates/categories';
import { THEME_IDS, type ThemeId } from '@/themes/presets';

/**
 * De brief: wat de ondernemer invult in het formulier.
 *
 * Bewust klein gehouden. In de eerste stap vult een template deze gegevens in;
 * later krijgt het AI-model exact dit object als gestructureerde invoer — nooit
 * een lap vrije tekst, zodat het resultaat voorspelbaar blijft.
 */
export const BriefSchema = z.object({
  businessName: z.string().trim().min(2, 'Vul een bedrijfsnaam in (minstens 2 tekens).').max(60),
  city: z.string().trim().max(60).optional().or(z.literal('')),

  /* Twee aparte controles, want het zijn twee verschillende problemen. Een
     onbekende waarde is onzin; een bestaande branche zonder template is een
     redelijke wens waar we nog niet aan toe zijn. De gebruiker hoort het
     verschil te lezen.

     Let op het gebruik van `error` en niet `message`: in Zod 4 geldt een
     `message` op het enum als foutopvang voor het hele veld en overschrijft die
     óók de melding van de refine hieronder. Met `error` op beide blijven de twee
     meldingen apart — gecontroleerd met deze zod-versie, zie de tests in
     tests/categories.test.ts. */
  category: z
    .enum(CATEGORY_IDS, { error: 'Kies een branche uit de lijst.' })
    .refine(isAvailableCategory, {
      error: (issue) => {
        const value = issue.input;
        const label = isCategoryId(String(value))
          ? categoryLabel(value as CategoryId)
          : 'die branche';
        return `Voor ${label} is er nog geen ontwerp. Kies voorlopig een andere branche.`;
      },
    }),

  /* Het thema wordt hier gevalideerd in plaats van verderop afgevangen. Eerder
     stond hier z.string() terwijl het type ThemeId beloofde; die leugen werd
     met twee casts overeind gehouden. */
  theme: z.enum(THEME_IDS, { error: 'Kies een stijl uit de lijst.' }),

  /** Hoe lang bestaat de zaak? Alleen gebruikt om concrete zinnen te maken. */
  since: z
    .string()
    .trim()
    .regex(/^(19|20)\d{2}$/, 'Vul een jaartal in, bijvoorbeeld 2011.')
    .optional()
    .or(z.literal('')),
});

/**
 * Het type volgt nu uit het schema in plaats van ernaast te leven. Wat het type
 * belooft, is precies wat de validatie waarmaakt.
 */
export type Brief = z.infer<typeof BriefSchema>;

export type { AvailableCategoryId, CategoryId, ThemeId };
