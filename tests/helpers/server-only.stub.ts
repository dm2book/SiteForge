/**
 * Een leeg bestand dat in de tests de plaats inneemt van het pakket
 * `server-only`.
 *
 * Dat pakket bestaat uit twee bestanden: een leeg bestand dat wordt geladen in
 * een servercomponent, en een bestand dat meteen een fout gooit zodra het ergens
 * anders terechtkomt. Zo wordt de grens een BOUWFOUT in plaats van een afspraak.
 *
 * Vitest draait geen Next-build en kent de voorwaarde `react-server` niet, dus
 * daar komt altijd de gooiende variant boven — en dan kan geen enkele test de
 * opslaglaag nog importeren. In `vitest.config.ts` wijzen we het pakket daarom
 * naar dit lege bestand.
 *
 * Wat dat betekent: de bescherming van `server-only` geldt in de build, niet in
 * de tests. Dat de grens in onze eigen code ook werkelijk gerespecteerd wordt,
 * controleert `tests/server-boundary.test.ts` — die leest de importgrafiek en
 * faalt zodra een clientcomponent bij `src/server/` kan komen.
 */
export {};
