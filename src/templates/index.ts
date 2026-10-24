import type { Brief } from '@/lib/brief';
import type { SiteConfig } from '@/site/schema';
import type { AvailableCategoryId } from './categories';
import { buildBarberSite } from './barber';

export * from './categories';

type TemplateBuilder = (brief: Brief) => SiteConfig;

/**
 * De templateregistry.
 *
 * Het type is `Record<AvailableCategoryId, …>`, en `AvailableCategoryId` wordt
 * afgeleid uit `categories.ts`. Zet je daar een branche op `available: true`
 * zonder hier een bouwfunctie toe te voegen, dan is dat een compilatiefout — je
 * kunt dus geen branche aanbieden die niets oplevert.
 */
export const TEMPLATE_BUILDERS: Record<AvailableCategoryId, TemplateBuilder> = {
  barber: buildBarberSite,
};

export function buildSite(brief: Brief): SiteConfig {
  /* `brief.category` is door het schema al beperkt tot een beschikbare branche,
     dus deze opzoeking kan niet mislukken. Geen onbereikbare foutmelding meer
     die nooit getest kon worden. */
  return TEMPLATE_BUILDERS[brief.category](brief);
}
