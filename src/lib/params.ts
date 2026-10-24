import { BriefSchema, type Brief } from './brief';
import { THEMES } from '@/themes/presets';

/**
 * Van URL-parameters naar een gevalideerde brief.
 *
 * In deze eerste stap is er nog geen database, dus de brief reist in de URL.
 * Dat heeft een prettig neveneffect: een preview is deelbaar en overleeft een
 * herlaadactie. Zodra projectopslag er is, vervangt een project-id dit.
 */
export type BriefResult =
  | { ok: true; brief: Brief }
  | { ok: false; errors: string[] };

export function briefFromParams(params: Record<string, string | string[] | undefined>): BriefResult {
  const read = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const theme = read('theme') ?? 'midnight-craft';
  const candidate = {
    businessName: read('name') ?? '',
    city: read('city') ?? '',
    category: read('category') ?? 'barber',
    theme: theme in THEMES ? theme : 'midnight-craft',
    since: read('since') ?? '',
  };

  const parsed = BriefSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  return { ok: true, brief: parsed.data as Brief };
}
