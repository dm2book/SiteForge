import { BriefSchema, type Brief } from './brief';

/**
 * Van URL-parameters naar een gevalideerde brief.
 *
 * In deze eerste stap is er nog geen database, dus de brief reist in de URL.
 * Dat heeft een prettig neveneffect: een preview is deelbaar en overleeft een
 * herlaadactie. Zodra projectopslag er is, vervangt een project-id dit.
 *
 * Er wordt hier niets meer "rechtgezet" vóór de validatie. Eerder viel een
 * ONGELDIG thema stilzwijgend terug op het standaardthema en werd het resultaat
 * met `as Brief` doorgegeven; nu bepaalt het schema wat geldig is en krijgt de
 * gebruiker te lezen wat er mis is.
 *
 * Een ONTBREKENDE parameter is iets anders dan een foute: wie `?theme=` weglaat
 * heeft geen keuze gemaakt, dus vullen we de standaardkeuze van het formulier
 * in. Wie `?theme=onzin` meegeeft heeft wél een keuze gemaakt, en die bestaat
 * niet — dat is een fout en wordt als fout gemeld.
 */
export type BriefResult = { ok: true; brief: Brief } | { ok: false; errors: string[] };

export function briefFromParams(
  params: Record<string, string | string[] | undefined>,
): BriefResult {
  const read = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const parsed = BriefSchema.safeParse({
    businessName: read('name') ?? '',
    city: read('city') ?? '',
    category: read('category') ?? 'barber',
    theme: read('theme') ?? 'midnight-craft',
    since: read('since') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  return { ok: true, brief: parsed.data };
}
