import 'server-only';

import type { UserId } from '../identity';
import type { SiteConfig } from '@/site/schema';
import type { AvailableCategoryId } from '@/templates/categories';
import type { ThemeId } from '@/themes/presets';

/**
 * De opslaglaag, als contract.
 *
 * Eén interface, straks twee implementaties: één in het geheugen (voor tests)
 * en één op PostgreSQL. De toegangstests draaien tegen allebei, zodat de regels
 * uit besluit 0002 niet van de implementatie afhangen.
 *
 * De regel `import 'server-only'` bovenaan staat er voor de zekerheid. Dit
 * bestand bevat vandaag alleen typen, en die worden bij het compileren
 * weggelaten — een clientcomponent die er `import type` uit haalt, haalt dus
 * niets binnen en merkt er niets van. Zodra hier ooit één waarde bij komt
 * (een constante, een hulpfunctie) is de bescherming er meteen, zonder dat
 * iemand eraan hoeft te denken.
 *
 * ── Twee dingen die bewust ontbreken ──────────────────────────────────────
 *
 * 1. Er is GEEN `getProject(projectId)`. Besluit 0002 zegt: het kennen van een
 *    id geeft nooit toegang. Een functie die alleen een project-id aanneemt is
 *    precies de functie die iemand later per ongeluk gebruikt. Door hem niet te
 *    schrijven, kan dat niet.
 *
 * 2. Er is geen `updateVersion` of `deleteVersion`. Versies zijn
 *    alleen-toevoegen; een wijziging is een nieuwe rij.
 *
 * ── Waarom lezen en schrijven niet symmetrisch zijn ───────────────────────
 *
 * `addVersion` neemt een `SiteConfig`: alleen een configuratie die al door
 * `parseSiteConfig` is gekomen, mag de opslag in. `getVersion` geeft de
 * configuratie terug als `unknown`, want wat eruit komt kan door een nieuwere
 * versie van deze code zijn geschreven. De aanroeper moet er `loadStoredConfig`
 * op loslaten. Die asymmetrie is geen slordigheid maar het ontwerp met twee
 * poorten uit besluit 0002, paragraaf 3.
 */

export type ProjectId = string;
export type VersionId = string;

export type Project = {
  id: ProjectId;
  ownerId: UserId;
  name: string;
  category: AvailableCategoryId;
  theme: ThemeId;
  /** ISO-8601, in UTC. */
  createdAt: string;
  updatedAt: string;
};

/** Wat er over een versie bekend is zonder de configuratie zelf te lezen. */
export type VersionSummary = {
  id: VersionId;
  projectId: ProjectId;
  versionNo: number;
  schemaVersion: number;
  createdBy: UserId;
  createdAt: string;
};

/**
 * Een opgeslagen versie zoals hij uit de opslag komt.
 *
 * `schemaVersion` is het veld uit de KOLOM — dat is leidend, niet wat er
 * toevallig in de JSON staat. Geef precies deze twee velden door aan
 * `loadStoredConfig`.
 */
export type StoredVersion = VersionSummary & { config: unknown };

export type NewProject = {
  ownerId: UserId;
  name: string;
  category: AvailableCategoryId;
  theme: ThemeId;
};

/**
 * Alles neemt een `UserId` als eerste argument, ook het lezen. Er is geen
 * "stille" variant zonder gebruiker.
 *
 * `null` betekent altijd hetzelfde: je krijgt dit niet. Of het project niet
 * bestaat of niet van jou is, wordt niet verklapt — anders kun je met een reeks
 * verzoeken afleiden welke id's bestaan.
 */
export interface ProjectStore {
  createProject(userId: UserId, input: Omit<NewProject, 'ownerId'>): Promise<Project>;

  getOwnedProject(userId: UserId, projectId: ProjectId): Promise<Project | null>;

  /** Voegt een nieuwe versie toe. `null` als dit project niet van deze gebruiker is. */
  addVersion(
    userId: UserId,
    projectId: ProjectId,
    config: SiteConfig,
  ): Promise<VersionSummary | null>;

  /** Nieuwste eerst. `null` als dit project niet van deze gebruiker is. */
  listVersions(userId: UserId, projectId: ProjectId): Promise<VersionSummary[] | null>;

  /**
   * Eén versie, opgezocht BINNEN het project. Het versie-id alleen is geen
   * sleutel: hoort de versie bij een ander project, dan is het antwoord `null`,
   * ook als de gebruiker eigenaar is van dat andere project.
   */
  getVersion(
    userId: UserId,
    projectId: ProjectId,
    versionId: VersionId,
  ): Promise<StoredVersion | null>;
}
