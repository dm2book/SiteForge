import type { Brief } from '@/lib/brief';
import type { SiteConfig } from '@/site/schema';
import { buildBarberSite } from './barber';

/**
 * De templateregistry.
 *
 * Eén plek waar branche → bouwfunctie staat. Een nieuwe branche toevoegen is
 * een regel hier plus een bestand ernaast; de rest van de applicatie verandert
 * niet. Dat is de reden dat dit een registry is en geen switch ergens diep in
 * een component.
 */
export const TEMPLATE_BUILDERS = {
  barber: buildBarberSite,
} as const;

export type TemplateCategory = keyof typeof TEMPLATE_BUILDERS;

export function hasTemplate(category: string): category is TemplateCategory {
  return category in TEMPLATE_BUILDERS;
}

export function buildSite(brief: Brief): SiteConfig {
  const build = TEMPLATE_BUILDERS[brief.category as TemplateCategory];
  if (!build) {
    throw new Error(
      `Er is nog geen template voor de branche "${brief.category}". ` +
        `Beschikbaar: ${Object.keys(TEMPLATE_BUILDERS).join(', ')}.`,
    );
  }
  return build(brief);
}
