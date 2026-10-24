/**
 * De ENIGE bron voor welke branches bestaan.
 *
 * Dit stond eerder op drie plekken: de enum in het briefschema, de keuzelijst
 * van het formulier en de registry met bouwfuncties. Die moesten met de hand in
 * de pas blijven, en dat ging al mis: een URL met `category=restaurant` gaf
 * "Kies een branche." terwijl de gebruiker wel degelijk een bestaande branche
 * koos — er was alleen nog geen template.
 *
 * Nu leiden het schema, het formulier en de registry zich allemaal hiervan af.
 * Dit bestand importeert met opzet niets, zodat er geen importkring kan ontstaan.
 */
export const CATEGORIES = {
  barber: { label: 'Barbier / kapsalon', available: true },
  restaurant: { label: 'Restaurant', available: false },
  auto: { label: 'Autodealer', available: false },
  realestate: { label: 'Vastgoed', available: false },
  gym: { label: 'Sportschool', available: false },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

/**
 * De branches waarvoor een template bestaat, afgeleid uit `available`.
 *
 * `templates/index.ts` gebruikt dit type om af te dwingen dat elke branche die
 * hier `available: true` heeft, ook werkelijk een bouwfunctie heeft. Zet je er
 * een op true zonder template, dan is dat een compilatiefout in plaats van een
 * verrassing in productie.
 */
export type AvailableCategoryId = {
  [K in CategoryId]: (typeof CATEGORIES)[K]['available'] extends true ? K : never;
}[CategoryId];

/** Alle branche-ids, in de volgorde waarin ze in het formulier horen. */
export const CATEGORY_IDS = Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]];

/** Alleen de branches die nu echt een website kunnen opleveren. */
export const AVAILABLE_CATEGORY_IDS = CATEGORY_IDS.filter(
  (id) => CATEGORIES[id].available,
) as AvailableCategoryId[];

export function isCategoryId(value: string): value is CategoryId {
  return value in CATEGORIES;
}

export function isAvailableCategory(value: string): value is AvailableCategoryId {
  return isCategoryId(value) && CATEGORIES[value].available;
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES[id].label;
}
