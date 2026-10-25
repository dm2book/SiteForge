/**
 * Tekst die gegarandeerd binnen het schema past.
 *
 * ── Wat hier eerder fout ging ─────────────────────────────────────────────
 * Het barbier-template schreef `${naam} — Barbier in ${stad}` en hoopte dat
 * het zou passen. Het schema staat voor `meta.title` 60 tekens toe, het
 * formulier voor de naam ook 60. Bij een naam van 38 tekens plus "Amsterdam"
 * werd de titel 61 tekens, keurde het schema de configuratie af en kreeg de
 * bezoeker een serverfout. Een doodgewone naam als "Barbershop Het Scherpe
 * Mes Amsterdam Oost" was genoeg.
 *
 * ── De oplossing ──────────────────────────────────────────────────────────
 * Een template raadt niet meer, maar kiest. Je geeft een reeks varianten van
 * rijk naar sober; `fit` neemt de eerste die past. De laatste variant hoort
 * altijd te passen — meestal is dat de bedrijfsnaam alleen, en die is nooit
 * langer dan het veld waar hij in moet.
 *
 * Zo wordt er nooit midden in een bedrijfsnaam geknipt. Wat wegvalt is onze
 * eigen opsmuk ("— Barbier in Amsterdam"), niet de naam van de klant.
 *
 * Tellen gebeurt met `.length`, precies zoals Zod `.max()` telt. Dat is het
 * aantal UTF-16-eenheden: een emoji telt voor twee. Zouden we anders tellen,
 * dan zou `fit` zeggen dat iets past terwijl het schema het afkeurt.
 */

/**
 * Knipt af als er echt geen variant past. Dit is het vangnet, niet het plan:
 * komt het hier, dan mist de aanroeper een korte variant.
 *
 * Knipt nooit een surrogaatpaar doormidden (dat levert een kapot teken op) en
 * zoekt een spatie vlakbij, zodat er geen half woord blijft staan.
 */
export function truncate(value: string, limit: number): string {
  if (limit <= 0) return '';
  if (value.length <= limit) return value;

  let cut = limit - 1; // ruimte voor het beletselteken
  // Een hoog surrogaat op de grens hoort bij het teken erna: één terug.
  const code = value.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut -= 1;

  const head = value.slice(0, cut);
  const space = head.lastIndexOf(' ');
  const body = space > cut - 14 && space > 0 ? head.slice(0, space) : head;

  return body.replace(/[\s.,;:·—-]+$/, '') + '…';
}

/**
 * Geeft de eerste variant die binnen `limit` past.
 *
 * Zet de varianten van rijk naar sober. Past er geen enkele, dan wordt de
 * laatste afgekapt — dat hoort in de praktijk niet voor te komen en de
 * domeintest in `tests/text-budget.test.ts` bewaakt dat.
 */
export function fit(limit: number, candidates: readonly string[]): string {
  for (const candidate of candidates) {
    const value = candidate.trim();
    if (value.length > 0 && value.length <= limit) return value;
  }
  const last = (candidates[candidates.length - 1] ?? '').trim();
  return truncate(last, limit);
}
