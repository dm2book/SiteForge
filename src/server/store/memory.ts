import 'server-only';

import { CURRENT_SCHEMA_VERSION, parseSiteConfig, type SiteConfig } from '@/site/schema';
import { isAvailableCategory } from '@/templates/categories';
import { isThemeId } from '@/themes/presets';
import { isUsableUserId, type UserId } from '../identity';
import type {
  NewProject,
  Project,
  ProjectId,
  ProjectStore,
  StoredVersion,
  VersionId,
  VersionSummary,
} from './types';

/**
 * De opslag in het geheugen.
 *
 * Bedoeld voor tests en voor lokaal ontwikkelen zonder database. Zij houdt zich
 * aan exact dezelfde regels als de PostgreSQL-implementatie die later komt —
 * dat is het hele punt: de toegangstests draaien tegen allebei, dus een regel
 * die hier klopt en daar niet, valt om.
 *
 * Wat zij NIET kan, en wat er dus ook niet mee bewezen wordt: gelijktijdigheid.
 * Twee verzoeken die elkaar in de rede vallen, vergrendelingen, transacties die
 * terugdraaien — dat is gedrag van de database. Besluit 0002 eist daarom dat de
 * gelijktijdigheidstests tegen een echte PostgreSQL draaien.
 */

type Clock = () => Date;
type IdMaker = () => string;

export type MemoryStoreOptions = {
  /** Vervangbaar in tests, zodat tijdstempels voorspelbaar zijn. */
  now?: Clock;
  /** Vervangbaar in tests, zodat id's voorspelbaar zijn. */
  newId?: IdMaker;
};

export function createMemoryProjectStore(options: MemoryStoreOptions = {}): ProjectStore {
  const now: Clock = options.now ?? (() => new Date());
  const newId: IdMaker = options.newId ?? (() => globalThis.crypto.randomUUID());

  const projects = new Map<ProjectId, Project>();
  const versions = new Map<VersionId, StoredVersion>();

  /* Alles wat naar buiten gaat is een kopie. Een echte database geeft je ook
     geen verwijzing naar zijn eigen geheugen; zonder deze kopie zou een
     aanroeper de opslag kunnen wijzigen door het teruggegeven object aan te
     passen, en dan test je iets anders dan je straks draait. */
  const copy = <T>(value: T): T => structuredClone(value);

  /**
   * De enige manier om bij een project te komen. Geeft `null` als er geen
   * bruikbare gebruiker is, als het project niet bestaat, of als het niet van
   * deze gebruiker is — alle drie met hetzelfde antwoord, zodat je er niets
   * uit kunt afleiden.
   */
  function ownedProject(userId: UserId, projectId: ProjectId): Project | null {
    if (!isUsableUserId(userId)) return null;
    if (typeof projectId !== 'string' || projectId.length === 0) return null;
    const project = projects.get(projectId);
    if (!project) return null;
    return project.ownerId === userId ? project : null;
  }

  return {
    async createProject(userId: UserId, input: Omit<NewProject, 'ownerId'>): Promise<Project> {
      /* Geen gebruiker betekent: niets opslaan. Een uitzondering en niet `null`,
         want hier is geen sprake van "dit bestaat niet voor jou" maar van een
         aanroep die nooit had mogen gebeuren. */
      if (!isUsableUserId(userId)) {
        throw new Error('createProject: geen geauthenticeerde gebruiker');
      }

      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (name.length === 0 || name.length > 120) {
        throw new Error('createProject: een projectnaam is 1 tot 120 tekens');
      }

      /* Branche en thema worden tijdens het draaien gecontroleerd met dezelfde
         registraties die het formulier en het schema gebruiken — niet met een
         eigen lijstje, want twee lijsten gaan uit elkaar lopen. Het type houdt
         een verkeerde waarde al tegen bij het compileren; dit vangt wat daar
         buitenom komt, bijvoorbeeld uit een JSON-body die ergens als `any` is
         binnengekomen. Straks doet een `check`-constraint in PostgreSQL
         hetzelfde, en dan zijn beide implementaties het eens. */
      if (!isAvailableCategory(input.category)) {
        throw new Error(`createProject: onbekende of niet-beschikbare branche`);
      }
      if (!isThemeId(input.theme)) {
        throw new Error(`createProject: onbekend thema`);
      }

      const moment = now().toISOString();
      const project: Project = {
        id: newId(),
        ownerId: userId,
        name,
        category: input.category,
        theme: input.theme,
        createdAt: moment,
        updatedAt: moment,
      };
      projects.set(project.id, project);
      return copy(project);
    },

    async getOwnedProject(userId: UserId, projectId: ProjectId): Promise<Project | null> {
      const project = ownedProject(userId, projectId);
      return project ? copy(project) : null;
    },

    async addVersion(
      userId: UserId,
      projectId: ProjectId,
      config: SiteConfig,
    ): Promise<VersionSummary | null> {
      const project = ownedProject(userId, projectId);
      if (!project) return null;

      /* De laatste poort vóór de opslag.
         Het type zegt `SiteConfig`, maar een type is geen controle: een
         configuratie die via een `any`, een cast of een JSON-body binnenkomt
         heeft dat type ook. En wat hier ongevalideerd in gaat, komt er later
         uit als een pagina. Besluit 0002 zegt dat `parseSiteConfig` streng
         blijft voor alles van buiten; opslaan is de plek waar "van buiten"
         voorgoed "van ons" wordt.
         Wat er wordt opgeslagen is het RESULTAAT van de validatie, met
         standaardwaarden ingevuld — niet de ruwe invoer. */
      const gevalideerd = parseSiteConfig(config);
      if (!gevalideerd.ok) {
        /* Alleen paden en foutsoorten in de melding: de configuratie zelf kan
           klantgegevens bevatten en hoort niet in een foutmelding of log. */
        const waar = gevalideerd.errors.map((e) => `${e.path} (${e.code})`).join(', ');
        throw new Error(`addVersion: configuratie komt niet door het schema — ${waar}`);
      }

      const vorige = [...versions.values()].filter((v) => v.projectId === project.id);
      const versionNo = vorige.reduce((hoogste, v) => Math.max(hoogste, v.versionNo), 0) + 1;

      const stored: StoredVersion = {
        id: newId(),
        projectId: project.id,
        versionNo,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdBy: userId,
        createdAt: now().toISOString(),
        /* De gevalideerde configuratie gaat als kopie de opslag in. Blijft de
           aanroeper daarna in zijn eigen object schrijven, dan verandert er
           niets aan wat is opgeslagen — net als bij een database. */
        config: copy(gevalideerd.config),
      };
      versions.set(stored.id, stored);
      project.updatedAt = stored.createdAt;

      return copy(samenvatting(stored));
    },

    async listVersions(userId: UserId, projectId: ProjectId): Promise<VersionSummary[] | null> {
      const project = ownedProject(userId, projectId);
      if (!project) return null;

      return [...versions.values()]
        .filter((v) => v.projectId === project.id)
        .sort((a, b) => b.versionNo - a.versionNo)
        .map((v) => copy(samenvatting(v)));
    },

    async getVersion(
      userId: UserId,
      projectId: ProjectId,
      versionId: VersionId,
    ): Promise<StoredVersion | null> {
      /* Eerst het project, dan pas de versie. Het versie-id is nooit op zichzelf
         genoeg: een versie die bij een ander project hoort, geeft `null` — ook
         als de gebruiker van dát andere project wél eigenaar is. */
      const project = ownedProject(userId, projectId);
      if (!project) return null;

      const version = versions.get(versionId);
      if (!version || version.projectId !== project.id) return null;
      return copy(version);
    },
  };
}

function samenvatting(version: StoredVersion): VersionSummary {
  const { config: _config, ...rest } = version;
  return rest;
}
