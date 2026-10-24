import { z } from 'zod';
import type { ThemeId } from '@/themes/presets';

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
  category: z.enum(['barber'], { message: 'Kies een branche.' }),
  theme: z.string().min(1),
  /** Hoe lang bestaat de zaak? Alleen gebruikt om concrete zinnen te maken. */
  since: z
    .string()
    .trim()
    .regex(/^(19|20)\d{2}$/, 'Vul een jaartal in, bijvoorbeeld 2011.')
    .optional()
    .or(z.literal('')),
});

export type Brief = z.infer<typeof BriefSchema> & { theme: ThemeId };

export const CATEGORIES = [
  { id: 'barber', name: 'Barbier / kapsalon', available: true },
  { id: 'restaurant', name: 'Restaurant', available: false },
  { id: 'auto', name: 'Autodealer', available: false },
  { id: 'realestate', name: 'Vastgoed', available: false },
  { id: 'gym', name: 'Sportschool', available: false },
] as const;
