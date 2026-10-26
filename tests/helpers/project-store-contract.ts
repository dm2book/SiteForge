import { describe, it, expect } from 'vitest';
import { trustedUserId, type UserId } from '@/server/identity';
import type { ProjectStore } from '@/server/store/types';
import { loadStoredConfig } from '@/site/stored';
import { parseSiteConfig, CURRENT_SCHEMA_VERSION, type SiteConfig } from '@/site/schema';
import { buildSite } from '@/templates';
import type { Brief } from '@/lib/brief';

/**
 * De toegangsregels, als één set tests voor élke opslagimplementatie.
 *
 * Besluit 0002 legt de regels bij de serverfuncties, niet bij de database. Die
 * regels moeten dus in het geheugen even hard gelden als op PostgreSQL. Daarom
 * staan ze hier één keer en worden ze straks twee keer gedraaid — zodra de
 * PostgreSQL-implementatie er is, roept die hetzelfde aan.
 *
 * Wat hier NIET in staat: gelijktijdigheid. Twee verzoeken die elkaar in de
 * rede vallen is gedrag van de database; besluit 0002 eist daarvoor tests tegen
 * een echte PostgreSQL.
 */

const brief: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

function geldigeConfig(naam = brief.businessName): SiteConfig {
  const parsed = parseSiteConfig(buildSite({ ...brief, businessName: naam }));
  if (!parsed.ok) throw new Error('configuratie ongeldig in test');
  return parsed.config;
}

/** Een gebruiker zonder sessie, zoals verkeerde code hem zou doorgeven. */
const GEEN_GEBRUIKER = ['', '   ', null, undefined] as unknown as UserId[];

export function describeProjectStore(naam: string, maakStore: () => ProjectStore) {
  describe(`${naam}: toegang tot projecten`, () => {
    const A = trustedUserId('gebruiker-a');
    const B = trustedUserId('gebruiker-b');
    const nieuw = { name: 'Kapsalon A', category: 'barber', theme: 'midnight-craft' } as const;

    it('laat de eigenaar zijn eigen project terugvinden', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);

      const terug = await store.getOwnedProject(A, project.id);
      expect(terug).not.toBeNull();
      expect(terug?.id).toBe(project.id);
      expect(terug?.ownerId).toBe(A);
      expect(terug?.name).toBe('Kapsalon A');
    });

    it('geeft een andere gebruiker niets, ook niet met het juiste id', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);

      expect(await store.getOwnedProject(B, project.id)).toBeNull();
      expect(await store.listVersions(B, project.id)).toBeNull();
      expect(await store.addVersion(B, project.id, geldigeConfig())).toBeNull();
    });

    it('geeft hetzelfde antwoord voor "bestaat niet" en "niet van jou"', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);

      const vanIemandAnders = await store.getOwnedProject(B, project.id);
      const bestaatNiet = await store.getOwnedProject(B, 'bestaat-echt-niet');
      expect(vanIemandAnders).toEqual(bestaatNiet); // allebei null, geen onderscheid
    });

    it('schrijft niets zonder geauthenticeerde gebruiker', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      await store.addVersion(A, project.id, geldigeConfig());

      for (const geen of GEEN_GEBRUIKER) {
        await expect(store.createProject(geen, nieuw)).rejects.toThrow();
        expect(await store.getOwnedProject(geen, project.id)).toBeNull();
        expect(await store.listVersions(geen, project.id)).toBeNull();
        expect(await store.addVersion(geen, project.id, geldigeConfig('Ingebroken'))).toBeNull();
      }

      // De opslag is onveranderd: nog steeds één versie, en die van A.
      const versies = await store.listVersions(A, project.id);
      expect(versies).toHaveLength(1);
      expect(versies?.[0].createdBy).toBe(A);
    });

    it('weigert een project zonder bruikbare naam', async () => {
      const store = maakStore();
      await expect(store.createProject(A, { ...nieuw, name: '  ' })).rejects.toThrow();
      await expect(store.createProject(A, { ...nieuw, name: 'x'.repeat(121) })).rejects.toThrow();
    });

    /**
     * Branche en thema worden ook tijdens het draaien gecontroleerd.
     *
     * Het type houdt een verkeerde waarde al tegen bij het compileren, maar een
     * waarde die als `any` binnenkomt — uit een JSON-body, een formulier, een
     * cast — heeft dat type ook. De casts hieronder bootsen precies dat na.
     */
    it('weigert een branche die niet bestaat of nog geen template heeft', async () => {
      const store = maakStore();
      for (const category of ['ruimtevaart', 'restaurant', '', null, 42]) {
        await expect(
          store.createProject(A, { ...nieuw, category } as unknown as typeof nieuw),
          `branche ${JSON.stringify(category)}`,
        ).rejects.toThrow();
      }
    });

    it('weigert een thema dat niet bestaat', async () => {
      const store = maakStore();
      for (const theme of ['regenboog', '', null, 7]) {
        await expect(
          store.createProject(A, { ...nieuw, theme } as unknown as typeof nieuw),
          `thema ${JSON.stringify(theme)}`,
        ).rejects.toThrow();
      }
    });
  });

  describe(`${naam}: versies`, () => {
    const A = trustedUserId('gebruiker-a');
    const B = trustedUserId('gebruiker-b');
    const nieuw = { name: 'Kapsalon A', category: 'barber', theme: 'midnight-craft' } as const;

    it('telt versies per project op vanaf 1 en bewaart de oude', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);

      const een = await store.addVersion(A, project.id, geldigeConfig('Eerste'));
      const twee = await store.addVersion(A, project.id, geldigeConfig('Tweede'));
      expect(een?.versionNo).toBe(1);
      expect(twee?.versionNo).toBe(2);

      const versies = await store.listVersions(A, project.id);
      expect(versies?.map((v) => v.versionNo)).toEqual([2, 1]); // nieuwste eerst

      const oud = await store.getVersion(A, project.id, een!.id);
      expect(oud).not.toBeNull(); // alleen-toevoegen: de oude versie staat er nog
    });

    /**
     * Alleen-toevoegen, en dat moet ook zo blijven.
     *
     * Besluit 0002: een wijziging is een nieuwe rij, nooit een aanpassing van
     * een bestaande. Dat wordt vandaag afgedwongen doordat de interface geen
     * methode heeft om iets te wijzigen of te verwijderen — maar een interface
     * houdt alleen de TypeScript-aanroeper tegen. Deze twee tests leggen het
     * ook vast als gedrag, zodat de PostgreSQL-implementatie straks dezelfde
     * lat krijgt.
     */
    it('biedt geen enkele manier om een versie te wijzigen of te verwijderen', async () => {
      const store = maakStore();
      const verboden = [
        'updateVersion',
        'deleteVersion',
        'removeVersion',
        'setVersion',
        'saveVersion',
        'deleteProject',
        'updateProject',
        'getProject',
      ];
      for (const naam of verboden) {
        expect(
          (store as unknown as Record<string, unknown>)[naam],
          `de store heeft een methode "${naam}" die er niet hoort te zijn`,
        ).toBeUndefined();
      }
      expect(Object.keys(store).sort()).toEqual([
        'addVersion',
        'createProject',
        'getOwnedProject',
        'getVersion',
        'listVersions',
      ]);
    });

    it('laat een eerdere versie onaangeroerd als er een nieuwe bij komt', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const eerste = await store.addVersion(A, project.id, geldigeConfig('Eerste'));
      const voor = await store.getVersion(A, project.id, eerste!.id);

      await store.addVersion(A, project.id, geldigeConfig('Tweede'));
      await store.addVersion(A, project.id, geldigeConfig('Derde'));

      const na = await store.getVersion(A, project.id, eerste!.id);
      expect(na).toEqual(voor); // zelfde id, zelfde nummer, zelfde configuratie
      expect((na!.config as { meta: { businessName: string } }).meta.businessName).toBe('Eerste');
      expect(await store.listVersions(A, project.id)).toHaveLength(3);
    });

    it('slaat de schemaversie van het moment van schrijven op', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const versie = await store.addVersion(A, project.id, geldigeConfig());
      expect(versie?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('levert een configuratie op die door de leeslaag komt', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const versie = await store.addVersion(A, project.id, geldigeConfig('Ledger & Blade'));

      const opgeslagen = await store.getVersion(A, project.id, versie!.id);
      expect(opgeslagen).not.toBeNull();

      const geladen = loadStoredConfig({
        schemaVersion: opgeslagen!.schemaVersion,
        config: opgeslagen!.config,
      });
      expect(geladen.ok, geladen.ok ? '' : geladen.detail).toBe(true);
      if (geladen.ok) expect(geladen.config.meta.businessName).toBe('Ledger & Blade');
    });

    it('geeft een andere gebruiker de versie niet, ook niet met het juiste versie-id', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const versie = await store.addVersion(A, project.id, geldigeConfig());

      expect(await store.getVersion(B, project.id, versie!.id)).toBeNull();
    });

    it('maakt van een versie-id geen omweg langs het project', async () => {
      const store = maakStore();
      const vanA = await store.createProject(A, nieuw);
      const vanB = await store.createProject(B, { ...nieuw, name: 'Kapsalon B' });
      const versieVanA = await store.addVersion(A, vanA.id, geldigeConfig('Van A'));

      /* B is eigenaar van zijn eigen project en kent het versie-id van A.
         Dat mag geen toegang geven, in geen enkele combinatie. */
      expect(await store.getVersion(B, vanB.id, versieVanA!.id)).toBeNull();
      expect(await store.getVersion(B, vanA.id, versieVanA!.id)).toBeNull();

      // Ook A zelf komt er niet bij via het verkeerde project.
      expect(await store.getVersion(A, vanB.id, versieVanA!.id)).toBeNull();
    });

    it('geeft niets terug voor een project dat niet bestaat', async () => {
      const store = maakStore();
      expect(await store.getOwnedProject(A, 'niet-bestaand')).toBeNull();
      expect(await store.listVersions(A, 'niet-bestaand')).toBeNull();
      expect(await store.addVersion(A, 'niet-bestaand', geldigeConfig())).toBeNull();
      expect(await store.getVersion(A, 'niet-bestaand', 'ook-niet')).toBeNull();
    });

    it('geeft kopieën terug, geen vensters op de opslag', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const versie = await store.addVersion(A, project.id, geldigeConfig('Origineel'));

      const eerst = await store.getVersion(A, project.id, versie!.id);
      (eerst as unknown as Record<string, unknown>).versionNo = 99;
      ((eerst!.config as Record<string, unknown>).meta as Record<string, unknown>).businessName =
        'Gewijzigd';

      const nogmaals = await store.getVersion(A, project.id, versie!.id);
      expect(nogmaals?.versionNo).toBe(1);
      expect((nogmaals!.config as { meta: { businessName: string } }).meta.businessName).toBe(
        'Origineel',
      );
    });

    it('laat een wijziging in de doorgegeven configuratie de opslag niet raken', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const config = geldigeConfig('Origineel');
      const versie = await store.addVersion(A, project.id, config);

      (config.meta as { businessName: string }).businessName = 'Achteraf gewijzigd';

      const opgeslagen = await store.getVersion(A, project.id, versie!.id);
      expect((opgeslagen!.config as { meta: { businessName: string } }).meta.businessName).toBe(
        'Origineel',
      );
    });

    /**
     * De laatste poort vóór de opslag.
     *
     * `addVersion` belooft een `SiteConfig`, maar een type is geen controle.
     * Deze tests duwen er invoer doorheen die het type zou hebben maar het
     * schema niet haalt — precies wat er gebeurt als een configuratie ergens
     * als `any` is binnengekomen. Er mag dan niets worden opgeslagen.
     */
    it('slaat een configuratie die het schema niet haalt niet op', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      await store.addVersion(A, project.id, geldigeConfig('Goede versie'));

      const geldig = geldigeConfig();
      const kapot: { naam: string; waarde: unknown }[] = [
        { naam: 'niets', waarde: null },
        { naam: 'een tekst', waarde: 'geen configuratie' },
        { naam: 'leeg object', waarde: {} },
        { naam: 'zonder blokken', waarde: { ...geldig, blocks: [] } },
        {
          naam: 'twee heroblokken',
          waarde: { ...geldig, blocks: [geldig.blocks[0], geldig.blocks[0]] },
        },
        { naam: 'onbekend veld', waarde: { ...geldig, tracking: 'x' } },
        { naam: 'verkeerde schemaversie', waarde: { ...geldig, schemaVersion: 99 } },
        {
          naam: 'onveilige link',
          waarde: {
            ...geldig,
            blocks: [{ ...geldig.blocks[0], primary: { label: 'Klik', href: '//elders.example' } }],
          },
        },
      ];

      for (const geval of kapot) {
        await expect(
          store.addVersion(A, project.id, geval.waarde as SiteConfig),
          `ongeldige invoer: ${geval.naam}`,
        ).rejects.toThrow();
      }

      // Er staat nog precies één versie, en dat is de goede.
      const versies = await store.listVersions(A, project.id);
      expect(versies).toHaveLength(1);
      expect(versies?.[0].versionNo).toBe(1);
    });

    it('noemt in de foutmelding het pad, niet de inhoud van de configuratie', async () => {
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      const kapot = { ...geldigeConfig('Kerkstraat 12'), tracking: 'geheime waarde' };

      await expect(store.addVersion(A, project.id, kapot as unknown as SiteConfig)).rejects.toThrow(
        /\(root\) \(unrecognized_keys\)/,
      );
      await expect(
        store.addVersion(A, project.id, kapot as unknown as SiteConfig),
      ).rejects.not.toThrow(/geheime waarde|Kerkstraat/);
    });

    it('controleert eerst het eigenaarschap en pas daarna de configuratie', async () => {
      /* Een ongeldige configuratie van iemand die er sowieso niet bij mag,
         levert `null` op en geen uitzondering: de weigering gaat over toegang,
         en wat die persoon meestuurt doet er niet toe. */
      const store = maakStore();
      const project = await store.createProject(A, nieuw);
      expect(await store.addVersion(B, project.id, null as unknown as SiteConfig)).toBeNull();
      expect(await store.listVersions(A, project.id)).toHaveLength(0);
    });

    it('houdt projecten van verschillende gebruikers uit elkaar', async () => {
      const store = maakStore();
      const vanA = await store.createProject(A, nieuw);
      const vanB = await store.createProject(B, { ...nieuw, name: 'Kapsalon B' });
      await store.addVersion(A, vanA.id, geldigeConfig('Van A'));
      await store.addVersion(B, vanB.id, geldigeConfig('Van B'));

      expect(await store.listVersions(A, vanA.id)).toHaveLength(1);
      expect(await store.listVersions(A, vanB.id)).toBeNull();
      expect(await store.listVersions(B, vanA.id)).toBeNull();
    });
  });
}
