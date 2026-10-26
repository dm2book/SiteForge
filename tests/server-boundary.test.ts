import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * De grens tussen server en browser, nagerekend zonder extra pakket.
 *
 * In `src/server/` komt straks de verbinding met de database en het geheim dat
 * daarbij hoort. Wat daar staat mag nooit in een clientbundle belanden. De
 * gebruikelijke oplossing is het pakket `server-only`: dat laat de build falen
 * zodra zo'n module vanuit de browser wordt geïmporteerd.
 *
 * Dat pakket zit niet in dit project en er mocht in deze stap geen dependency
 * bij. Deze test is het alternatief: hij leest de importgrafiek van onze eigen
 * broncode en controleert dat je vanuit geen enkel `'use client'`-bestand bij
 * `src/server/` kunt komen, ook niet via een omweg van drie bestanden.
 *
 * Wat dit WEL doet: onze eigen code bewaken, inclusief indirecte imports.
 * Wat dit NIET doet: hetzelfde als `server-only`. Die bewaakt élke manier
 * waarop een bundler een module kan binnentrekken, ook via een pakket van
 * derden of een dynamische import die deze test niet leest. Zolang er nog geen
 * geheim in `src/server/` staat is dat verschil klein; vóór stap 3 hoort dat
 * pakket erbij. Dat staat ook in het rapport bij deze stap.
 */

const SRC = resolve(process.cwd(), 'src');

function alleBronbestanden(map: string): string[] {
  return readdirSync(map).flatMap((naam) => {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) return alleBronbestanden(pad);
    return /\.tsx?$/.test(naam) ? [pad] : [];
  });
}

/** De importpaden uit één bestand, zoals ze er letterlijk staan. */
function importSpecificaties(inhoud: string): string[] {
  const specs: string[] = [];
  for (const m of inhoud.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of inhoud.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

/** Van een importpad naar een bestand in `src/`, of `null` voor iets externs. */
function naarBestand(vanaf: string, spec: string): string | null {
  let basis: string;
  if (spec.startsWith('@/')) basis = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) basis = resolve(dirname(vanaf), spec);
  else return null; // een pakket, geen eigen bestand

  for (const kandidaat of [
    basis,
    `${basis}.ts`,
    `${basis}.tsx`,
    join(basis, 'index.ts'),
    join(basis, 'index.tsx'),
  ]) {
    if (existsSync(kandidaat) && statSync(kandidaat).isFile()) return kandidaat;
  }
  return null;
}

const bestanden = alleBronbestanden(SRC);
const inhoud = new Map(bestanden.map((f) => [f, readFileSync(f, 'utf8')]));

const isClientComponent = (tekst: string) => /^\s*['"]use client['"]\s*;?/m.test(tekst);
const isServerModule = (pad: string) => relative(SRC, pad).startsWith('server');
const toon = (pad: string) => relative(process.cwd(), pad);

describe('de serveropslag blijft aan de serverkant', () => {
  it('vindt de clientcomponenten en de servermodules', () => {
    const clients = bestanden.filter((f) => isClientComponent(inhoud.get(f)!));
    const servers = bestanden.filter(isServerModule);
    // Zonder deze twee zou de test hieronder leeg zijn en altijd slagen.
    expect(clients.length, 'geen enkel bestand met "use client" gevonden').toBeGreaterThan(0);
    expect(servers.length, 'geen enkele module in src/server/ gevonden').toBeGreaterThan(0);
  });

  it('kan vanuit geen enkele clientcomponent bij src/server/ komen', () => {
    const problemen: string[] = [];

    for (const start of bestanden.filter((f) => isClientComponent(inhoud.get(f)!))) {
      const gezien = new Set<string>([start]);
      const wachtrij: { pad: string; route: string[] }[] = [{ pad: start, route: [toon(start)] }];

      while (wachtrij.length > 0) {
        const { pad, route } = wachtrij.shift()!;
        for (const spec of importSpecificaties(inhoud.get(pad) ?? '')) {
          const volgend = naarBestand(pad, spec);
          if (!volgend || gezien.has(volgend)) continue;
          gezien.add(volgend);

          const nieuweRoute = [...route, toon(volgend)];
          if (isServerModule(volgend)) {
            problemen.push(nieuweRoute.join(' → '));
            continue;
          }
          wachtrij.push({ pad: volgend, route: nieuweRoute });
        }
      }
    }

    expect(problemen, problemen.join('\n')).toHaveLength(0);
  });
});

describe('wie mag een gebruiker vertrouwen', () => {
  /**
   * `trustedUserId()` maakt van een tekst een geauthenticeerde gebruiker. Die
   * beslissing hoort op precies één plek te worden genomen: in de laag die de
   * sessie controleert. Zolang die laag er niet is, hoort er in `src/` geen
   * enkele aanroep te staan.
   *
   * Komt stap 3 met een sessiecontrole, dan moet dit lijstje bewust worden
   * uitgebreid met dat ene bestand. Dat is de bedoeling: je kunt er niet per
   * ongeluk een tweede plek bij krijgen.
   */
  const MAG_AANROEPEN: string[] = [];

  it('wordt nergens in de applicatiecode aangeroepen', () => {
    const aanroepen = bestanden
      .filter((f) => f !== join(SRC, 'server', 'identity.ts'))
      .filter((f) => /\btrustedUserId\s*\(/.test(inhoud.get(f)!))
      .map(toon)
      .filter((f) => !MAG_AANROEPEN.includes(f));

    expect(aanroepen, `onverwachte aanroep van trustedUserId in: ${aanroepen.join(', ')}`).toEqual(
      [],
    );
  });

  it('weigert een lege gebruiker-id, zodat een ontbrekende sessie opvalt', async () => {
    const { trustedUserId } = await import('@/server/identity');
    expect(() => trustedUserId('')).toThrow();
    expect(() => trustedUserId('   ')).toThrow();
    expect(trustedUserId(' gebruiker-1 ')).toBe('gebruiker-1');
  });
});
