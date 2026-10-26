import {
  CURRENT_SCHEMA_VERSION,
  parseSiteConfig,
  type ConfigError,
  type SiteConfig,
} from './schema';

/**
 * De tweede poort: hoe een OPGESLAGEN configuratie weer binnenkomt.
 *
 * `parseSiteConfig` is de eerste poort en blijft streng: alles wat van buiten
 * komt — de editor, straks het AI-model — moet het in één keer goed doen.
 *
 * Voor onze eigen database ligt het anders. Die bevat configuraties die ooit
 * wél door de strenge poort zijn gegaan, maar misschien door een nieuwere
 * versie van deze code zijn geschreven. Dan is de vraag niet "klopt dit?" maar
 * "kan deze build dit veilig lezen?".
 *
 * Het antwoord is standaard NEE. Zie besluit 0002, paragraaf 3:
 *
 *   Een build mag nooit zélf concluderen dat een onbekend veld wel additief
 *   en dus ongevaarlijk zal zijn.
 *
 * Een oudere build kán dat ook niet weten: hij kent het veld per definitie
 * niet, dus hij weet niet of het iets toevoegt (onschuldig om weg te laten) of
 * iets wegneemt (waarbij weglaten een blok toont dat juist verborgen was).
 * Daarom wordt er alleen iets genegeerd als het hieronder BIJ NAAM in de
 * compatibiliteitstabel staat, met tests die aantonen dat negeren niets
 * verandert.
 *
 * Deze module logt zelf niets. Zij geeft terug wát er is overgeslagen en
 * waarom er geweigerd is; de aanroeper schrijft de logregel. Zo blijft dit
 * bestand te testen zonder dat er ergens tekst wegloopt, en blijft de regel
 * "alleen metadata loggen, nooit de waarde" bij de aanroeper zichtbaar.
 */

/** De oudste versie waarvan deze build een migratiepad heeft. */
export const OLDEST_SUPPORTED_SCHEMA_VERSION = 1;

/* ── Migraties ────────────────────────────────────────────────────────────
   Eén stap per versiesprong, van `from` naar `to = from + 1`. Geen enkele stap
   slaat een versie over, en migreren gebeurt altijd vóór valideren: een
   configuratie van versie 1 hoort niet door het schema van versie 3 gehaald te
   worden.

   De lijst is nu leeg, want er is nog maar één versie. Dat is geen vergetelheid
   maar de huidige stand; `migrationPath()` hieronder controleert dat er geen
   gaten in zitten zodra er wél stappen bijkomen.                            */

export type Migration = {
  from: number;
  to: number;
  /** Krijgt een losse kopie en geeft de aangepaste configuratie terug. */
  apply: (config: unknown) => unknown;
};

export const MIGRATIONS: readonly Migration[] = [];

/* ── Compatibiliteit ──────────────────────────────────────────────────────
   Per ondersteunde versie staat hier zwart op wit wat DEZE build van die
   versie kan lezen. Een verklaring vooraf, geen afleiding achteraf.         */

export type CompatibilityRule = {
  version: number;
  /** Kan deze build dit formaat lezen? Nee betekent: gecontroleerd weigeren. */
  readable: boolean;
  /**
   * Velden die deze build mag negeren, bij naam. Geen jokertekens en geen
   * "alle onbekende velden".
   *
   * Schrijfwijze: `meta.<veld>`, `theme.<veld>` of `<bloktype>.<veld>`, dus
   * bijvoorbeeld `hero.subtitle`. Velden die dieper in een blok zitten (in een
   * lijst met items) kunnen niet worden genegeerd; die vragen een versiesprong.
   */
  ignorableFields: readonly string[];
  /** Bloktypes die deze build mag overslaan; de rest van de pagina rendert. */
  ignorableBlockTypes: readonly string[];
  /** De tests die aantonen dat negeren hier niets verandert. */
  provenBy: readonly string[];
};

export const COMPATIBILITY: readonly CompatibilityRule[] = [
  {
    version: 1,
    readable: true,
    /* Leeg, en dat hoort zo: versie 1 is de versie die deze build zelf
       schrijft, dus er is niets onbekends te verwachten. Komt er ooit een
       additief veld bij, dan komt het hier bij naam te staan met de tests
       erbij — en pas dan mag een oudere build het overslaan. */
    ignorableFields: [],
    ignorableBlockTypes: [],
    provenBy: ['tests/stored-config.test.tsx'],
  },
];

/* ── Uitkomsten ─────────────────────────────────────────────────────────── */

/** Wat er is overgeslagen. Alleen namen en paden — nooit de waarde. */
export type IgnoredItem = { kind: 'field' | 'block'; path: string; name: string };

export type StoredConfigResult =
  | { ok: true; config: SiteConfig; ignored: IgnoredItem[] }
  | {
      ok: false;
      reason: 'unsupported_version' | 'incompatible_config';
      /** Eén regel metadata voor de log. Bevat geen inhoud uit de configuratie. */
      detail: string;
      errors: ConfigError[];
    };

/** Wat er uit de database komt: de versie uit de KOLOM, niet uit de JSON. */
export type StoredRow = { schemaVersion: number; config: unknown };

/** Vervangbaar in tests, zodat de regels ook te toetsen zijn met méér versies. */
export type StoredConfigDeps = {
  currentVersion: number;
  migrations: readonly Migration[];
  compatibility: readonly CompatibilityRule[];
};

const DEFAULTS: StoredConfigDeps = {
  currentVersion: CURRENT_SCHEMA_VERSION,
  migrations: MIGRATIONS,
  compatibility: COMPATIBILITY,
};

/* ── De leesvolgorde ────────────────────────────────────────────────────── */

export function loadStoredConfig(
  row: StoredRow,
  overrides: Partial<StoredConfigDeps> = {},
): StoredConfigResult {
  const deps = { ...DEFAULTS, ...overrides };
  const from = row.schemaVersion;

  const weiger = (
    reason: 'unsupported_version' | 'incompatible_config',
    detail: string,
    errors: ConfigError[] = [],
  ): StoredConfigResult => ({ ok: false, reason, detail, errors });

  // 1. Is het versienummer überhaupt een versienummer?
  if (!Number.isInteger(from) || from < 1) {
    return weiger('unsupported_version', `schema_version is geen geldig versienummer (${from})`);
  }

  // 2. Uit de toekomst? Dan niet terugbrengen, maar weigeren.
  if (from > deps.currentVersion) {
    return weiger(
      'unsupported_version',
      `opgeslagen versie ${from} is nieuwer dan de ondersteunde versie ${deps.currentVersion}`,
    );
  }

  // 3. Staat deze versie in de compatibiliteitstabel, en is hij leesbaar?
  const rule = deps.compatibility.find((r) => r.version === from);
  if (!rule) {
    return weiger('incompatible_config', `geen compatibiliteitsregel voor versie ${from}`);
  }
  if (!rule.readable) {
    return weiger('incompatible_config', `versie ${from} staat als niet-leesbaar in de tabel`);
  }
  if (
    rule.provenBy.length === 0 &&
    (rule.ignorableFields.length || rule.ignorableBlockTypes.length)
  ) {
    return weiger(
      'incompatible_config',
      `versie ${from} staat tolerantie toe zonder tests in provenBy`,
    );
  }

  // 4. De kolom is leidend. Staat er óók een versie in de JSON en wijkt die af,
  //    dan is de rij intern tegenstrijdig. Dan niet kiezen welke van de twee we
  //    geloven, maar weigeren — stil de ene boven de andere verkiezen is precies
  //    hoe je een website van de verkeerde vorm gaat renderen.
  const jsonVersion = (row.config as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (jsonVersion !== undefined && jsonVersion !== from) {
    const gezien = typeof jsonVersion === 'number' ? String(jsonVersion) : 'geen getal';
    return weiger(
      'incompatible_config',
      `schema_version in de kolom (${from}) wijkt af van schemaVersion in de JSON (${gezien})`,
    );
  }

  // 5. Is er een onafgebroken pad naar de huidige versie?
  const path = migrationPath(from, deps.currentVersion, deps.migrations);
  if (!path.ok) {
    return weiger('unsupported_version', path.detail);
  }

  // 6. Migreren, stap voor stap, op een kopie. Een migratie is gewone code en
  //    kan stuklopen op een rij die er anders uitziet dan de schrijver dacht.
  //    Dat mag geen uitzondering worden die ergens anders opduikt: deze functie
  //    belooft een resultaat terug te geven, ook als het antwoord "nee" is.
  let working: unknown;
  try {
    working = structuredClone(row.config);
    for (const step of path.steps) {
      working = step.apply(working);
    }
  } catch {
    return weiger(
      'incompatible_config',
      `migratie van versie ${from} naar ${deps.currentVersion} is mislukt`,
    );
  }

  /* Na de migratie IS de configuratie per definitie de huidige versie; het veld
     in de JSON is boekhouding die we hier bijwerken, zodat een migratiestap er
     niet aan hoeft te denken. We zetten het op de versie waar het SCHEMA op
     staat, want dat is wat de validatie hierna controleert. In productie is dat
     hetzelfde getal als `deps.currentVersion`; ze lopen alleen uiteen in tests
     die de versierouting met verzonnen versies narekenen. */
  if (working && typeof working === 'object') {
    (working as Record<string, unknown>).schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  // 7. Valideren, met precies de tolerantie die de regel toestaat.
  return parseStoredConfig(working, rule);
}

/** De stappen van `from` naar `to`, of waarom die er niet zijn. */
export function migrationPath(
  from: number,
  to: number,
  migrations: readonly Migration[],
): { ok: true; steps: Migration[] } | { ok: false; detail: string } {
  const steps: Migration[] = [];
  for (let v = from; v < to; v++) {
    const step = migrations.find((m) => m.from === v && m.to === v + 1);
    if (!step) return { ok: false, detail: `geen migratiestap van versie ${v} naar ${v + 1}` };
    steps.push(step);
  }
  return { ok: true, steps };
}

/* ── Valideren met toegestane tolerantie ─────────────────────────────────── */

/**
 * Als `parseSiteConfig`, maar met de uitzonderingen die de regel voor déze
 * versie bij naam toestaat. Alles wat niet in de regel staat, is een weigering.
 */
export function parseStoredConfig(input: unknown, rule: CompatibilityRule): StoredConfigResult {
  const ignored: IgnoredItem[] = [];
  let working = input;

  /* Eén ronde per weggehaald ding. De bovengrens voorkomt dat een fout in deze
     functie een oneindige lus wordt; in de praktijk zijn het er nul of één. */
  for (let ronde = 0; ronde <= 20; ronde++) {
    const parsed = parseSiteConfig(working);
    if (parsed.ok) return { ok: true, config: parsed.config, ignored };

    const schoongemaakt = removeOneIgnorable(working, parsed.errors, rule);
    if (!schoongemaakt) {
      return {
        ok: false,
        reason: 'incompatible_config',
        detail:
          `configuratie van versie ${rule.version} bevat iets wat deze build niet mag negeren: ` +
          parsed.errors.map((e) => `${e.path} (${e.code})`).join(', '),
        errors: parsed.errors,
      };
    }
    working = schoongemaakt.config;
    ignored.push(schoongemaakt.ignored);
  }

  return {
    ok: false,
    reason: 'incompatible_config',
    detail: `te veel te negeren onderdelen in versie ${rule.version}`,
    errors: [],
  };
}

/**
 * Haalt ÉÉN toegestaan onderdeel weg, of geeft `null` als er niets weg mag.
 *
 * Eén tegelijk, zodat elke verwijdering apart in `ignored` belandt en de
 * logregel precies kan zeggen wat er is overgeslagen.
 */
function removeOneIgnorable(
  config: unknown,
  errors: ConfigError[],
  rule: CompatibilityRule,
): { config: unknown; ignored: IgnoredItem } | null {
  const root = config as Record<string, unknown>;
  const blocks = Array.isArray(root?.blocks) ? (root.blocks as Record<string, unknown>[]) : [];

  for (const error of errors) {
    const segments = error.path.split('.');

    // a. Een onbekend veld in meta, theme of een blok.
    if (error.code === 'unrecognized_keys') {
      const owner = ownerName(segments, blocks);
      if (!owner) continue;

      /* Zod meldt álle onbekende velden van één object in één fout. We halen er
         hooguit één per ronde weg, en alleen eentje die bij naam is toegestaan.
         Staat er daarnaast een veld dat níét mag, dan blijft dat staan en loopt
         de volgende ronde tegen die fout aan: weigeren. */
      const key = (error.keys ?? []).find((k) => rule.ignorableFields.includes(`${owner}.${k}`));
      if (!key) continue;

      const kopie = structuredClone(config) as Record<string, unknown>;
      const doel = resolvePath(kopie, segments);
      if (!doel) continue;
      delete doel[key];
      return { config: kopie, ignored: { kind: 'field', path: error.path, name: key } };
    }

    // b. Een blok met een onbekend type.
    if (error.code === 'invalid_union' && segments[0] === 'blocks' && segments[2] === 'type') {
      const index = Number(segments[1]);
      const type = blocks[index]?.type;
      if (typeof type !== 'string' || !rule.ignorableBlockTypes.includes(type)) continue;

      const kopie = structuredClone(config) as Record<string, unknown>;
      (kopie.blocks as unknown[]).splice(index, 1);
      return { config: kopie, ignored: { kind: 'block', path: `blocks.${index}`, name: type } };
    }
  }

  return null;
}

/** `meta`, `theme` of het bloktype waar dit pad bij hoort — anders niets. */
function ownerName(segments: string[], blocks: Record<string, unknown>[]): string | null {
  if (segments.length === 1 && (segments[0] === 'meta' || segments[0] === 'theme')) {
    return segments[0];
  }
  if (segments.length === 2 && segments[0] === 'blocks') {
    const type = blocks[Number(segments[1])]?.type;
    return typeof type === 'string' ? type : null;
  }
  return null; // dieper dan dit kan niet worden genegeerd; dat vraagt een versiesprong
}

function resolvePath(
  root: Record<string, unknown>,
  segments: string[],
): Record<string, unknown> | null {
  let node: unknown = root;
  for (const segment of segments) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return node && typeof node === 'object' ? (node as Record<string, unknown>) : null;
}
