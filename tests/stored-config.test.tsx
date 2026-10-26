import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  COMPATIBILITY,
  MIGRATIONS,
  OLDEST_SUPPORTED_SCHEMA_VERSION,
  loadStoredConfig,
  migrationPath,
  type CompatibilityRule,
  type StoredConfigDeps,
} from '@/site/stored';
import { CURRENT_SCHEMA_VERSION, parseSiteConfig } from '@/site/schema';
import { SiteRenderer } from '@/site/SiteRenderer';
import { buildSite } from '@/templates';
import type { Brief } from '@/lib/brief';

/**
 * De tweede poort: wat er gebeurt als een OPGESLAGEN configuratie terugkomt.
 *
 * De regel uit besluit 0002 is dat weigeren de standaard is. Deze tests leggen
 * vast dat er niets wordt genegeerd wat niet bij naam is toegestaan, dat een
 * nieuwere versie nooit wordt "teruggebracht", en dat negeren — als het al mag
 * — werkelijk niets aan de pagina verandert.
 */

const brief: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

/** Een geldige configuratie zoals het template hem vandaag oplevert. */
const geldig = () => structuredClone(buildSite(brief)) as Record<string, unknown>;

/** Een regel die niets toestaat — het standaardgeval. */
const streng = (over: Partial<CompatibilityRule> = {}): CompatibilityRule => ({
  version: 1,
  readable: true,
  ignorableFields: [],
  ignorableBlockTypes: [],
  provenBy: ['tests/stored-config.test.tsx'],
  ...over,
});

const deps = (over: Partial<StoredConfigDeps> = {}): Partial<StoredConfigDeps> => ({
  currentVersion: 1,
  migrations: [],
  compatibility: [streng()],
  ...over,
});

const html = (config: unknown) => {
  const parsed = parseSiteConfig(config);
  if (!parsed.ok) throw new Error('configuratie ongeldig in test');
  return renderToStaticMarkup(<SiteRenderer config={parsed.config} />);
};

describe('de echte tabellen van deze build', () => {
  it('weigert geen enkele versie op het pad wegens een ontbrekende regel', () => {
    /* Toetst het gedrag, niet alleen de aanwezigheid van een rij in de tabel:
       voor elke ondersteunde versie moet `loadStoredConfig` ergens anders op
       stuklopen dan op "geen compatibiliteitsregel". */
    for (let v = OLDEST_SUPPORTED_SCHEMA_VERSION; v <= CURRENT_SCHEMA_VERSION; v++) {
      const r = loadStoredConfig({ schemaVersion: v, config: { ...geldig(), schemaVersion: v } });
      if (!r.ok) expect(r.detail, `versie ${v}`).not.toContain('geen compatibiliteitsregel');
    }
  });

  it('heeft een onafgebroken migratiepad van de oudste naar de huidige versie', () => {
    const pad = migrationPath(OLDEST_SUPPORTED_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION, MIGRATIONS);
    expect(pad.ok, pad.ok ? '' : pad.detail).toBe(true);
  });

  it('verwijst in elke provenBy naar een bestaand testbestand', () => {
    for (const regel of COMPATIBILITY) {
      expect(regel.provenBy.length, `versie ${regel.version} heeft geen provenBy`).toBeGreaterThan(
        0,
      );
      for (const pad of regel.provenBy) {
        expect(existsSync(resolve(process.cwd(), pad)), `${pad} bestaat niet`).toBe(true);
      }
    }
  });

  it('leest de configuratie die het template vandaag maakt', () => {
    const r = loadStoredConfig({ schemaVersion: CURRENT_SCHEMA_VERSION, config: geldig() });
    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) expect(r.ignored).toHaveLength(0);
  });
});

describe('een versie die deze build niet kent', () => {
  it('weigert een nieuwere versie in plaats van hem terug te brengen', () => {
    const r = loadStoredConfig({ schemaVersion: 2, config: geldig() }, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_version');
      expect(r.detail).toContain('nieuwer');
    }
  });

  it('weigert een versienummer dat geen versienummer is', () => {
    for (const v of [0, -1, 1.5, Number.NaN]) {
      const r = loadStoredConfig({ schemaVersion: v, config: geldig() }, deps());
      expect(r.ok, `versie ${v}`).toBe(false);
      if (!r.ok) expect(r.reason).toBe('unsupported_version');
    }
  });

  it('weigert een versie zonder compatibiliteitsregel', () => {
    const r = loadStoredConfig({ schemaVersion: 1, config: geldig() }, deps({ compatibility: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('incompatible_config');
  });

  it('weigert een versie die als niet-leesbaar staat aangemerkt', () => {
    const r = loadStoredConfig(
      { schemaVersion: 1, config: geldig() },
      deps({ compatibility: [streng({ readable: false })] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('incompatible_config');
  });

  it('weigert tolerantie die niet door tests is onderbouwd', () => {
    const r = loadStoredConfig(
      { schemaVersion: 1, config: geldig() },
      deps({ compatibility: [streng({ ignorableFields: ['hero.subtitle'], provenBy: [] })] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain('provenBy');
  });

  it('weigert als het migratiepad een gat heeft', () => {
    const r = loadStoredConfig(
      { schemaVersion: 1, config: geldig() },
      deps({
        currentVersion: 3,
        migrations: [{ from: 1, to: 2, apply: (c) => c }],
        compatibility: [streng()],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_version');
      expect(r.detail).toContain('van versie 2 naar 3');
    }
  });
});

describe('migreren gebeurt vóór valideren', () => {
  it('haalt een oudere configuratie door de stappen en rendert hem daarna', () => {
    /* Een verzonnen versie 1 waarin de titel nog `pageTitle` heette. Het
       schema van vandaag kent dat veld niet; de migratie hernoemt het. */
    const oud = geldig();
    const meta = oud.meta as Record<string, unknown>;
    meta.pageTitle = meta.title;
    delete meta.title;

    const r = loadStoredConfig(
      { schemaVersion: 1, config: oud },
      {
        currentVersion: 2,
        migrations: [
          {
            from: 1,
            to: 2,
            apply: (config) => {
              const c = config as Record<string, unknown>;
              const m = c.meta as Record<string, unknown>;
              m.title = m.pageTitle;
              delete m.pageTitle;
              return c; // schemaVersion wordt door de leeslaag bijgewerkt
            },
          },
        ],
        compatibility: [streng(), streng({ version: 2 })],
      },
    );

    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) expect(r.config.meta.title).toBe('Ledger & Blade — Barbier in Amsterdam');
  });

  it('raakt de opgeslagen rij niet aan: de migratie werkt op een kopie', () => {
    const origineel = geldig();
    const voor = JSON.stringify(origineel);
    loadStoredConfig(
      { schemaVersion: 1, config: origineel },
      deps({
        currentVersion: 2,
        migrations: [
          {
            from: 1,
            to: 2,
            apply: (c) => {
              (c as Record<string, unknown>).gesloopt = true;
              return c;
            },
          },
        ],
        compatibility: [streng(), streng({ version: 2 })],
      }),
    );
    expect(JSON.stringify(origineel)).toBe(voor);
  });
});

describe('de kolom is leidend, niet de JSON', () => {
  it('weigert een rij waarin kolom en JSON het oneens zijn', () => {
    const config = geldig();
    config.schemaVersion = 2; // de JSON beweert iets anders dan de kolom

    const r = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('incompatible_config');
      expect(r.detail).toContain('wijkt af');
    }
  });

  it('kiest niet stilzwijgend de hoogste of de laagste van de twee', () => {
    const laag = geldig();
    laag.schemaVersion = 1;
    expect(
      loadStoredConfig({ schemaVersion: 2, config: laag }, deps({ currentVersion: 2 })).ok,
    ).toBe(false);
  });

  it('laat een JSON zonder schemaVersion toe en vult hem zelf in', () => {
    const config = geldig();
    delete config.schemaVersion;
    const r = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) expect(r.config.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('een migratie die stukloopt', () => {
  it('levert een gecontroleerde weigering op in plaats van een uitzondering', () => {
    const roep = () =>
      loadStoredConfig(
        { schemaVersion: 1, config: geldig() },
        deps({
          currentVersion: 2,
          migrations: [
            {
              from: 1,
              to: 2,
              apply: () => {
                throw new Error('stuk');
              },
            },
          ],
          compatibility: [streng(), streng({ version: 2 })],
        }),
      );

    expect(roep).not.toThrow();
    const r = roep();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('incompatible_config');
      expect(r.detail).toContain('migratie');
      expect(r.detail).not.toContain('stuk'); // geen interne melding naar buiten
    }
  });
});

describe('onbekende velden', () => {
  it('weigert een onbekend veld dat niet bij naam is toegestaan', () => {
    const config = geldig();
    (config.blocks as Record<string, unknown>[])[0].subtitle = 'iets nieuws';

    const r = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('incompatible_config');
      expect(r.errors.some((e) => e.code === 'unrecognized_keys')).toBe(true);
    }
  });

  /**
   * Criterium 4 uit besluit 0002: een veld dat expliciet genegeerd mag worden,
   * levert exact dezelfde gerenderde pagina op. Dát is het bewijs dat negeren
   * hier niets verandert — zonder dat bewijs mag het veld niet in de lijst.
   */
  it('negeert een veld dat bij naam is toegestaan, met hetzelfde resultaat', () => {
    const zonder = geldig();
    const met = structuredClone(zonder);
    (met.blocks as Record<string, unknown>[])[0].subtitle = 'iets nieuws';

    const r = loadStoredConfig(
      { schemaVersion: 1, config: met },
      deps({ compatibility: [streng({ ignorableFields: ['hero.subtitle'] })] }),
    );

    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) {
      expect(r.ignored).toEqual([{ kind: 'field', path: 'blocks.0', name: 'subtitle' }]);
      expect(renderToStaticMarkup(<SiteRenderer config={r.config} />)).toBe(html(zonder));
    }
  });

  it('negeert een toegestaan veld in meta, maar niet een ander veld ernaast', () => {
    const config = geldig();
    (config.meta as Record<string, unknown>).campagne = 'x';
    const regel = streng({ ignorableFields: ['meta.campagne'] });

    expect(
      loadStoredConfig({ schemaVersion: 1, config }, deps({ compatibility: [regel] })).ok,
    ).toBe(true);

    const tweede = geldig();
    (tweede.meta as Record<string, unknown>).campagne = 'x';
    (tweede.meta as Record<string, unknown>).anders = 'y';
    expect(
      loadStoredConfig({ schemaVersion: 1, config: tweede }, deps({ compatibility: [regel] })).ok,
    ).toBe(false);
  });

  it('leunt niet op de bewoording van de foutmelding om de veldnaam te vinden', () => {
    /* Een veldnaam met een aanhalingsteken erin. Wie de naam uit de melding
       zou vissen, haalt hier het verkeerde veld weg of niets. */
    const naam = 'vreemd"veld';
    const config = geldig();
    (config.blocks as Record<string, unknown>[])[0][naam] = 'x';

    const geweigerd = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(geweigerd.ok).toBe(false);

    const toegestaan = loadStoredConfig(
      { schemaVersion: 1, config },
      deps({ compatibility: [streng({ ignorableFields: [`hero.${naam}`] })] }),
    );
    expect(toegestaan.ok, toegestaan.ok ? '' : toegestaan.detail).toBe(true);
    if (toegestaan.ok) expect(toegestaan.ignored[0].name).toBe(naam);
  });

  it('haalt meerdere toegestane velden uit hetzelfde blok, één voor één', () => {
    const zonder = geldig();
    const met = structuredClone(zonder);
    Object.assign((met.blocks as Record<string, unknown>[])[0], { subtitle: 'a', badge: 'b' });

    const r = loadStoredConfig(
      { schemaVersion: 1, config: met },
      deps({ compatibility: [streng({ ignorableFields: ['hero.subtitle', 'hero.badge'] })] }),
    );
    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) {
      expect(r.ignored.map((i) => i.name).sort()).toEqual(['badge', 'subtitle']);
      expect(renderToStaticMarkup(<SiteRenderer config={r.config} />)).toBe(html(zonder));
    }
  });

  it('negeert niets diep in een blok, ook niet als de naam toevallig overeenkomt', () => {
    /* Drie niveaus dieper dan een blok: in een item van een lijst, in de media
       van een blok, en in een knop. Geen van drieën mag worden weggestript én
       geen van drieën mag worden geaccepteerd — allebei zou betekenen dat een
       veld waarvan we de betekenis niet kennen stilletjes verdwijnt. */
    const gevallen = [
      {
        naam: 'item in een lijst',
        toegestaan: 'services.subtitle',
        maak: () => {
          const c = geldig();
          const d = (c.blocks as Record<string, unknown>[]).find((b) => b.type === 'services')!;
          (d.items as Record<string, unknown>[])[0].subtitle = 'x';
          return c;
        },
      },
      {
        naam: 'media van een blok',
        toegestaan: 'hero.credit',
        maak: () => {
          const c = geldig();
          ((c.blocks as Record<string, unknown>[])[0].media as Record<string, unknown>).credit =
            'x';
          return c;
        },
      },
      {
        naam: 'knop in een blok',
        toegestaan: 'hero.target',
        maak: () => {
          const c = geldig();
          ((c.blocks as Record<string, unknown>[])[0].primary as Record<string, unknown>).target =
            'x';
          return c;
        },
      },
    ];

    for (const geval of gevallen) {
      const config = geval.maak();
      const voor = JSON.stringify(config);

      // Ook mét een regel die zo heet, blijft het een weigering.
      const r = loadStoredConfig(
        { schemaVersion: 1, config },
        deps({ compatibility: [streng({ ignorableFields: [geval.toegestaan] })] }),
      );
      expect(r.ok, geval.naam).toBe(false);
      if (!r.ok) expect(r.reason, geval.naam).toBe('incompatible_config');
      expect(JSON.stringify(config), `${geval.naam}: invoer is aangepast`).toBe(voor);
    }
  });
});

describe('onbekende bloktypes', () => {
  it('weigert een onbekend bloktype dat niet bij naam is toegestaan', () => {
    const config = geldig();
    (config.blocks as unknown[]).splice(1, 0, { id: 'banner', type: 'banner', text: 'x' });

    const r = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('incompatible_config');
  });

  it('slaat een toegestaan bloktype over en rendert de rest', () => {
    const zonder = geldig();
    const met = structuredClone(zonder);
    (met.blocks as unknown[]).splice(1, 0, { id: 'banner', type: 'banner', text: 'x' });

    const r = loadStoredConfig(
      { schemaVersion: 1, config: met },
      deps({ compatibility: [streng({ ignorableBlockTypes: ['banner'] })] }),
    );

    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
    if (r.ok) {
      expect(r.ignored).toEqual([{ kind: 'block', path: 'blocks.1', name: 'banner' }]);
      expect(renderToStaticMarkup(<SiteRenderer config={r.config} />)).toBe(html(zonder));
    }
  });

  it('weigert alsnog als het overslaan de pagina ongeldig maakt', () => {
    /* De hero overslaan zou een pagina zonder <h1> opleveren. Het schema houdt
       dat tegen, en dan is weigeren het juiste antwoord. */
    const config = geldig();
    (config.blocks as Record<string, unknown>[])[0].type = 'banner';

    const r = loadStoredConfig(
      { schemaVersion: 1, config },
      deps({ compatibility: [streng({ ignorableBlockTypes: ['banner'] })] }),
    );
    expect(r.ok).toBe(false);
  });
});

describe('wat er in de logregel terechtkomt', () => {
  it('bevat alleen metadata, nooit de inhoud van de configuratie', () => {
    const config = geldig();
    (config.blocks as Record<string, unknown>[])[0].geheim = 'Kerkstraat 12, 1012 AB Amsterdam';

    const r = loadStoredConfig({ schemaVersion: 1, config }, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.detail).not.toContain('Kerkstraat');
      expect(r.detail).not.toContain('Ledger & Blade');
      expect(r.detail).toContain('blocks.0');
    }
  });

  it('noemt bij een overgeslagen onderdeel het pad en de naam, niet de waarde', () => {
    const config = geldig();
    (config.blocks as Record<string, unknown>[])[0].subtitle = 'Kerkstraat 12';

    const r = loadStoredConfig(
      { schemaVersion: 1, config },
      deps({ compatibility: [streng({ ignorableFields: ['hero.subtitle'] })] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.ignored)).not.toContain('Kerkstraat');
  });
});
