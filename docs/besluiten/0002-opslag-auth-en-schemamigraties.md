# Besluit 2 — Opslag, inloggen en schemamigraties

**Status:** vastgesteld · **Datum:** 2026-10-26 · **Fase:** 2 (projectopslag)
**Bouwt voort op:** [besluit 0001](0001-publicatieroutes-en-toegang.md), dat vastlegt
hóé een site publiek komt te staan. Dit document legt vast wáár de gegevens
staan, wie erbij mag en wat er gebeurt als het formaat verandert.
**Wijzigt besluit 0001 op één punt** — zie de laatste paragraaf.

Er is op dit moment nog geen database, geen inlog en geen Supabase-project.
Dit document bevat geen code en geen SQL die nu al uitgevoerd moet worden; het
beschrijft de vorm die de implementatie moet hebben.

---

## De aanleiding

De gebruikelijke manier om Supabase aan een Next-app te knopen is: de
anon-sleutel in de browser zetten, vanuit client-componenten queries doen en
RLS "straks nog even instellen". Die route is sneller op dag één en kost je op
dag dertig alle gegevens van al je klanten. Bij een websitebouwer gaat het om
adresgegevens, telefoonnummers, openingstijden en concepten die nog niet naar
buiten mogen — van ondernemers die ervan uitgaan dat jij dat op orde hebt.

Daar komt bij dat opslag het formaat bevriest. Wat vandaag als JSON de database
in gaat, moet over twee jaar nog te lezen zijn, óók nadat het schema is
veranderd en óók na een mislukte uitrol die teruggedraaid wordt. Fase 1 maakte
het schema streng; juist die strengheid heeft bij opslag een tegenhanger nodig.
Dit document regelt beide.

---

## 1. Al het databaseverkeer loopt via de server

### Het besluit

- **De browser praat nooit rechtstreeks met Supabase.** Geen Supabase-client in
  een client-component, geen queries vanuit de browser, ook niet "alleen om te
  lezen". Pagina's en server-acties halen gegevens op aan de serverkant en
  sturen alleen het resultaat naar de browser.
- **`SUPABASE_SERVICE_ROLE_KEY` komt nooit in de clientbundle.** Dus: nooit een
  naam die met `NEXT_PUBLIC_` begint, nooit geïmporteerd in een bestand met
  `'use client'`, nooit doorgegeven als prop of in `searchParams`.
- **De databaseclient staat in één server-only module.** Bijvoorbeeld
  `src/server/db.ts`, met `import 'server-only'` bovenaan. Dat pakket laat de
  build falen zodra zo'n module per ongeluk vanuit de browser wordt
  geïmporteerd — een vergissing wordt dan een bouwfout in plaats van een lek.
- **Secrets worden bij het opstarten gevalideerd.** Eén module leest de
  omgevingsvariabelen, controleert dat ze bestaan en de juiste vorm hebben, en
  stopt het proces met een duidelijke melding als dat niet zo is. Beter een app
  die niet start dan een app die draait en stilletjes niets opslaat.
- **Secrets komen niet in logs.** Niet de sleutel zelf, niet een deel ervan,
  niet in een foutmelding die naar de browser gaat. Logregels bevatten
  hooguit "`SUPABASE_SERVICE_ROLE_KEY` ontbreekt" — de naam, nooit de waarde.
  Bij het loggen van een fout gaat alleen de boodschap mee, niet het hele
  configuratie-object waar de sleutel in zou kunnen zitten.
- **Iedere serverfunctie die gegevens aanraakt doet twee dingen, in deze
  volgorde:** eerst vaststellen wíé de verzoeker is (de sessie), dan vaststellen
  of die persoon déze handeling op dít object mag doen. Een functie die het
  eerste doet maar het tweede overslaat, is niet veilig — ingelogd zijn is geen
  toestemming.

### Waarom zo

De service-role-sleutel is de hoofdsleutel van de database: hij omzeilt alle
toegangsregels. Zo'n sleutel hoort op precies één plek te bestaan, op een
machine die jij beheert. Zodra er ook maar één pad is waarlangs hij in de
browser kan komen, is elke andere maatregel versiering.

De keuze "alles via de server" maakt het bovendien eenvoudiger te overzien.
Er is één plek waar toegang wordt verleend, en die kun je lezen en testen.

---

## 2. RLS staat aan, maar is het vangnet — niet het slot

### Het besluit

- **Row Level Security staat aan op iedere tabel.** Zonder uitzondering, ook op
  tabellen waarvan we denken dat ze niet gevoelig zijn.
- **Er zijn standaard géén policies die directe toegang toestaan.** De rollen
  `anon` en `authenticated` krijgen niets: geen `SELECT`, geen `INSERT`, geen
  `UPDATE`, geen `DELETE`. Naast RLS worden de rechten op die rollen ook
  ingetrokken (`REVOKE`), zodat een uitgelekte anon-sleutel op een lege muur
  stuit in plaats van op een policy die misschien net te ruim staat.
- **De service-role omzeilt RLS.** Dat is geen omissie maar een eigenschap van
  Postgres: de rol die wij server-side gebruiken heeft `BYPASSRLS`. Daarom is
  RLS hier **niet de primaire autorisatie**. Het is de tweede muur, voor het
  geval er ooit tóch een sleutel of een verbinding buiten de server om bestaat.
- **De primaire autorisatie staat in server-side functies.** Alle toegang tot
  een project loopt via functies die eigenaarschap controleren, met als
  belangrijkste `getOwnedProject(userId, projectId)`. Die functie geeft `null`
  terug als het project niet bestaat óf niet van deze gebruiker is — het
  verschil tussen die twee wordt niet naar buiten gecommuniceerd, want anders
  kun je met een reeks verzoeken afleiden welke project-id's bestaan.
- **Nooit een opzoeking op alleen een project-id.** Er is geen functie
  `getProject(projectId)` zonder gebruiker. Bestaat die functie niet, dan kan
  niemand hem per ongeluk gebruiken. Wat voor projecten geldt, geldt voor alles
  wat eraan hangt: versies worden opgehaald via het project, niet los.
- **Mocht de browser later tóch rechtstreeks moeten lezen** (bijvoorbeeld voor
  realtime samenwerken), dan worden daarvoor expliciete policies geschreven in
  een eigen besluit, mét tests. Niet door de bestaande deny-all stilletjes open
  te zetten.

### Acceptatiecriteria (tests, niet goede voornemens)

Deze tests horen bij de implementatie van fase 2 en zijn de maatstaf:

1. Eigenaar A maakt een project aan en leest het terug: **lukt**.
2. Gebruiker B vraagt datzelfde project op met het juiste id: **krijgt niets**,
   en de foutmelding maakt geen onderscheid tussen "bestaat niet" en "niet van
   jou".
3. Een verzoek zónder sessie naar dezelfde route: **wordt geweigerd**, en er
   wordt geen enkele databaseregel gelezen.
4. Gebruiker B probeert een versie van A's project op te halen via het
   versie-id: **krijgt niets**.
5. Een directe query met de anon-sleutel op elke tabel: **levert nul rijen op**
   (bewijst dat RLS en de ingetrokken rechten echt aan staan).

---

## 3. Schema-validatie en migraties

### Twee poorten, niet één

Fase 1 heeft één poort: `parseSiteConfig`, streng, met `.strict()` op elk
object. Bij opslag komen er twee soorten invoer binnen die niet hetzelfde zijn:

| Waar komt het vandaan | Poort | Gedrag |
|---|---|---|
| Editor, AI-model, import, API — alles van buiten | `parseSiteConfig` | **streng**. Een onbekend veld is een fout. Het model moet het goed doen, niet half. |
| Onze eigen database, ná migratie | `parseStoredConfig` | **streng, tenzij de compatibiliteitsregel voor díé versie iets anders toestaat.** |

De strenge poort blijft precies zoals hij is. Wat hier bij komt, geldt
uitsluitend voor gegevens die wij zelf eerder hebben weggeschreven en die al
een keer door de strenge poort zijn gegaan.

### De leesvolgorde ligt vast

```
rij uit de database
   ↓  schema_version uit de KOLOM lezen (niet uit de JSON)
   ↓  compatibiliteit opzoeken voor die versie — staat die niet in de tabel: weigeren
   ↓  migrate(config, van, naar)   — expliciet, stap voor stap, geordend
   ↓  parseStoredConfig(config)    — valideert het resultaat
   ↓  renderer
```

Migreren gebeurt vóór valideren. Een configuratie van versie 1 hoort niet door
het schema van versie 3 gehaald te worden; eerst 1→2, dan 2→3, elke stap een
eigen functie met een eigen test. Geen enkele stap slaat een versie over.

### Weigeren is de standaard, tolerantie is de uitzondering

Dit is de kern van deze paragraaf, en het is een aanscherping op hoe het er
eerder stond:

> **Een build mag nooit zélf concluderen dat een onbekend veld wel "additief"
> en dus ongevaarlijk zal zijn.**

Een oudere build kán dat ook niet weten. Hij kent het veld per definitie niet,
dus hij weet niet of het iets toevoegt (`hero.subtitle`, onschuldig om weg te
laten) of iets wegneemt (`hero.hidden`, waarbij weglaten een blok toont dat de
ondernemer juist had verborgen). Een regel als "onbekende optionele velden
worden weggelaten" laat die beoordeling impliciet aan code die de informatie
niet heeft. Dat is precies de verkeerde kant om te leunen.

Daarom: **`parseStoredConfig` weigert standaard alles wat hij niet kent.**
Negeren mag alleen als er voor de aangetroffen schemaversie een expliciete,
vooraf vastgelegde en geteste compatibiliteitsregel bestaat die het toestaat.

### Compatibiliteit wordt per versie vastgelegd

Naast de migratiestappen houdt de code een **compatibiliteitstabel** bij: per
ondersteunde schemaversie staat er zwart op wit wat deze build van die versie
kan lezen. Geen afleiding achteraf, maar een verklaring vooraf.

Per versie legt de tabel vast:

| Wat | Betekenis |
|---|---|
| `version` | het versienummer waar deze regel over gaat |
| `readable` | kan deze build dit formaat lezen, ja of nee |
| `ignorableFields` | een **opsomming bij naam** van paden die deze build mag negeren, bijvoorbeeld `hero.subtitle` — geen jokertekens, geen "alle onbekende velden" |
| `ignorableBlockTypes` | een opsomming bij naam van bloktypes die deze build mag overslaan |
| `provenBy` | de test(en) die aantonen dat negeren hier geen inhoud of bedoeling verandert |

Wat er niet bij naam in staat, mag niet genegeerd worden. Komt
`parseStoredConfig` een onbekend veld of bloktype tegen dat niet in de lijst
voor die versie staat, dan is dat geen verrassing om soepel mee om te gaan maar
een gecontroleerde weigering.

Een regel in die tabel is pas geldig als `provenBy` naar bestaande tests wijst.
Dit zijn er minimaal twee per vermelding:

1. een test die een vastgelegde voorbeeldconfiguratie van die versie — mét het
   te negeren veld — door migratie, validatie en renderer haalt, en die de
   uitkomst vergelijkt met dezelfde configuratie zónder dat veld: de gerenderde
   pagina moet gelijk zijn;
2. een test die aantoont dat een onbekend veld dat **niet** in de lijst staat,
   wél wordt geweigerd.

Zonder die tests geldt de versie als niet-compatibel en wordt er geweigerd. Dat
is bewust streng: de belofte "een gepubliceerde site gaat nooit stuk doordat wij
het formaat veranderen" is alleen iets waard als hij aantoonbaar is.

Hieruit volgt ook de regel voor wie een veld toevoegt:

> **Een wijziging die de betekenis of de zichtbaarheid van bestáánde inhoud
> verandert, is nooit additief en verhoogt altijd de versie.**

Maar die regel is nu niet meer het vangnet; het vangnet is dat een oudere build
een veld pas negeert als iemand het daar expliciet voor heeft aangewezen en met
een test heeft onderbouwd.

### Bij twijfel: weigeren

In al deze gevallen weigert de leeslaag, zonder uitzondering:

- het versienummer in de kolom is **hoger** dan `CURRENT_SCHEMA_VERSION`;
- het versienummer is onbekend, of er is **geen onafgebroken migratiepad** naar
  een ondersteunde versie;
- er is voor die versie **geen regel in de compatibiliteitstabel**, of de regel
  staat op `readable: false`;
- er duikt een onbekend veld of bloktype op dat **niet bij naam** in
  `ignorableFields` of `ignorableBlockTypes` staat;
- de configuratie komt niet door `parseStoredConfig` na migratie.

Weigeren betekent concreet:

- **niet downgraden**, niet "proberen of het toevallig past", niet velden
  weggooien tot het past;
- **een gecontroleerde fout**: de aanroeper krijgt een expliciet resultaat
  (`{ ok: false, reason: 'unsupported_version' | 'incompatible_config' }`),
  geen uitzondering die ergens anders opduikt;
- voor een bezoeker van een gepubliceerde site de foutpagina uit fase 1 —
  rustige tekst, correcte statuscode, geen binnenwerk op het scherm;
- voor de eigenaar in de editor een leesbare melding dat deze versie niet
  getoond kan worden, met de mogelijkheid een eerdere versie te openen;
- en een logregel met **alleen metadata**: project-id, versie-id, gevonden
  versienummer, ondersteunde versie, de reden, en bij een onbekend veld het
  pad en de sleutelnaam. Nooit de waarde, nooit de configuratie zelf — daar
  staan klantgegevens in.

Dit is ook het geval dat optreedt na een teruggedraaide uitrol. Weigeren is dan
het juiste antwoord: een site die er anders uitziet dan de ondernemer heeft
opgeslagen is erger dan een site die eerlijk zegt dat er iets mis is.

### Wat `parseStoredConfig` mag weglaten

Alleen dit, en alleen als het bovenstaande is afgewerkt:

1. **Een veld dat bij naam in `ignorableFields` staat** voor de aangetroffen
   versie, met een logregel.
2. **Een bloktype dat bij naam in `ignorableBlockTypes` staat** voor die versie:
   dat blok wordt overgeslagen, de rest van de pagina rendert. Dit sluit aan op
   het gedrag dat de renderer in productie al heeft voor een bloktype zonder
   component.

Elk ander onbekend veld en elk ander onbekend bloktype leidt tot weigeren.

### `CURRENT_SCHEMA_VERSION` is de enige bron

Op dit moment staat het getal `1` op twee plekken: `z.literal(1)` in
`src/site/schema.ts` en `schemaVersion: 1` in `src/templates/barber.ts`. Met een
databasekolom erbij worden dat er drie. Daarom:

- `src/site/schema.ts` exporteert `export const CURRENT_SCHEMA_VERSION = 1;`
- het schema gebruikt `z.literal(CURRENT_SCHEMA_VERSION)`;
- templates vullen `schemaVersion: CURRENT_SCHEMA_VERSION`;
- bij het wegschrijven gaat dezelfde constante in de kolom `schema_version`;
- de migratietabel is een lijst van stappen van `n` naar `n + 1`, en er is een
  test die controleert dat er een onafgebroken pad bestaat van de oudste
  ondersteunde versie tot `CURRENT_SCHEMA_VERSION`;
- de compatibiliteitstabel heeft een regel voor elke versie op dat pad, en een
  test controleert dat er geen gaten in zitten.

### Rollbacks en rolling deploys

Tijdens een uitrol draaien oude en nieuwe code even naast elkaar, en na een
mislukte uitrol draait alleen de oude weer. Wat dan gebeurt:

| Situatie | Gedrag |
|---|---|
| Oude code leest een veld dat bij naam in haar eigen `ignorableFields` staat | veld wordt weggelaten, site rendert, logregel |
| Oude code leest een onbekend veld dat daar **niet** in staat | geweigerd met `incompatible_config`, foutpagina, logregel |
| Oude code leest een **hoger** versienummer | geweigerd met `unsupported_version`, foutpagina, logregel |
| Nieuwe code leest een **oudere** configuratie | migratie, daarna normaal renderen |

Praktische regel die hieruit volgt: **een versiesprong en een uitrol zijn twee
aparte momenten.** Eerst een versie uitrollen die het nieuwe formaat kan lézen
maar nog het oude schrijft; pas als die stabiel draait, overschakelen op
schrijven.

Maar die volgorde is op zichzelf geen garantie. Ze werkt alleen als de oude
en de nieuwe code **aantoonbaar allebei overweg kunnen met het formaat dat ze
in die periode delen.** Tijdens een rolling deploy schrijft de nieuwe code
rijen die de oude code nog moet kunnen lezen, en na een rollback blijven die
rijen staan. Daarom gelden bij elke versiesprong deze voorwaarden, vóór de
uitrol:

1. De oude build heeft een compatibiliteitsregel voor wat de nieuwe build gaat
   schrijven, mét de tests uit `provenBy`. Bestaat die regel niet, dan is de
   uitrol niet veilig terug te draaien en moet de schrijfstap wachten.
2. Er is getest dat een configuratie die de nieuwe build schrijft, door de oude
   build gelezen en gerenderd wordt met hetzelfde resultaat.
3. Kan of wil je die compatibiliteit niet aantonen, dan is het alternatief
   eerlijker: het versienummer verhogen en accepteren dat de oude build
   gecontroleerd weigert. Een zichtbare, nette foutpagina op een handvol sites
   is beter dan een stille verandering op allemaal.

Zolang 1 en 2 niet zijn afgevinkt, blijft de nieuwe code lezen-maar-niet-
schrijven. Dat is de enige stand waarin terugdraaien altijd kan.
---

## 4. Het gegevensmodel

Drie tabellen. Concepten en gepubliceerde sites staan los van elkaar — dat is
geen opslagdetail maar de kern van besluit 0001.

### `projects` — het werkstuk van de ondernemer

| Kolom | Type | Regels |
|---|---|---|
| `id` | `uuid` | primaire sleutel, willekeurig gegenereerd |
| `owner_id` | `uuid` | verplicht, verwijst naar de gebruikerstabel, `on delete cascade` |
| `name` | `text` | verplicht, 1–120 tekens |
| `category` | `text` | verplicht, een waarde uit `templates/categories.ts` |
| `theme` | `text` | verplicht, een waarde uit `themes/presets.ts` |
| `created_at`, `updated_at` | `timestamptz` | verplicht |

Index op `(owner_id, updated_at desc)` — de projectenlijst van één gebruiker is
de enige opzoeking die vaak gebeurt.

`category` en `theme` zijn de werkinstellingen van het project. De waarden die
tellen voor een gerenderde pagina staan in de configuratie van de versie zelf;
deze kolommen zijn er voor de projectenlijst en voor het aanmaken van een
volgende versie.

### `site_versions` — de geschiedenis, alleen-toevoegen

| Kolom | Type | Regels |
|---|---|---|
| `id` | `uuid` | primaire sleutel |
| `project_id` | `uuid` | verplicht, verwijst naar `projects.id`, `on delete cascade` |
| `version_no` | `integer` | verplicht, begint bij 1, loopt per project op |
| `config` | `jsonb` | verplicht, de gevalideerde configuratie |
| `schema_version` | `integer` | verplicht, de `CURRENT_SCHEMA_VERSION` van het moment van schrijven |
| `created_by` | `uuid` | verplicht, wie deze versie maakte |
| `created_at` | `timestamptz` | verplicht |

- Unieke sleutel op `(project_id, version_no)`: twee keer versie 3 bestaat niet.
- Index op `(project_id, version_no desc)`: "de nieuwste versie" is de meest
  gestelde vraag.
- **Alleen-toevoegen.** Er worden geen rechten voor `UPDATE` en `DELETE`
  verleend, en een trigger weigert ze alsnog. Een wijziging is een nieuwe rij.
  Terug naar gisteren is dan: een oude rij kopiëren naar een nieuwe versie.
- Een configuratie is gemeten ongeveer 5 KB, met het maximum van 30 blokken
  ongeveer 20 KB. `jsonb` is daarvoor ruim voldoende.

### `published_sites` — de momentopname die publiek is

| Kolom | Type | Regels |
|---|---|---|
| `project_id` | `uuid` | primaire sleutel, verwijst naar `projects.id`, `on delete cascade` |
| `slug` | `text` | verplicht, **uniek**, kleine letters/cijfers/streepjes, 3–63 tekens |
| `config` | `jsonb` | verplicht, de kopie die publiek is |
| `schema_version` | `integer` | verplicht |
| `source_version_id` | `uuid` | verwijst naar de `site_versions`-rij waarvan dit de kopie is |
| `revision` | `integer` | verplicht, begint bij 1 en gaat bij élke publicatie met één omhoog |
| `published_by` | `uuid` | verplicht, wie publiceerde |
| `published_at` | `timestamptz` | verplicht |

- **Eén rij per project**: `project_id` is de primaire sleutel. Meer dan één
  gepubliceerde variant (staging, A/B) is een latere beslissing.
- **Het bestaan van de rij ís de publicatie.** Een concept heeft geen rij in
  deze tabel. Dat is de concrete vorm van "alleen als de site de status
  `published` heeft" uit besluit 0001: er is geen `status`-kolom die per
  ongeluk op de verkeerde waarde kan staan.
- **De configuratie is een kopie, geen verwijzing.** Verder werken in de editor
  verandert de live site niet. Opnieuw publiceren vervangt de rij.
- `slug` is uniek over de hele tabel en wordt gecontroleerd tegen een lijst
  gereserveerde namen (`www`, `app`, `api`, `admin`, `render`, `preview`,
  `login`, en wat er verder op het hoofddomein staat).
- Een eigen domein komt later als extra kolom met een eigen unieke sleutel.

### Wat publiek leesbaar is

Alleen wat in `published_sites` staat, en dan nog alleen via de publieke route
uit besluit 0001 (opzoeking op slug of domein). Er is geen publieke route die
`projects` of `site_versions` leest. Een concept verlaat de server alleen naar
de ingelogde eigenaar.

### Publiceren: wanneer een momentopname vervangen mag worden

Publiceren is de enige plek waar een rij in `published_sites` wordt
overschreven, en dus de enige plek waar een live klantsite kan veranderen. Dat
maakt het ook de plek waar een oudere build tijdens een rolling deploy of na
een rollback schade kan aanrichten: zij leest een nieuwere momentopname niet
goed, maar zou hem wél kunnen vervángen door iets ouders. Daarom gelden hier
zes regels. Ze zijn met opzet klein gehouden — twee extra kolommen en één
voorwaardelijke opdracht aan de database — want een ingewikkeld
publicatiesysteem is in deze fase een groter risico dan het probleem dat het
oplost.

**1. Publiceren controleert eerst, aan de serverkant.** Er is één
serverfunctie, `publish(userId, projectId, versionId, expectedRevision, intent)`,
en die controleert in deze volgorde:

- **eigenaarschap** — via `getOwnedProject(userId, projectId)`; geen eigenaar,
  geen publicatie, en geen onderscheid tussen "bestaat niet" en "niet van jou";
- **herkomst** — de opgegeven versie hoort bij dít project;
- **de schemaversie van de te publiceren configuratie** — die moet door deze
  build gelezen kunnen worden volgens de compatibiliteitstabel uit paragraaf 3;
- **de configuratie zelf** — hij gaat door het volledige leespad
  (`migrate` → `parseStoredConfig`) vóórdat er iets wordt weggeschreven. Komt
  hij daar niet doorheen, dan wordt er niet gepubliceerd.

Deze controles gaan over de configuratie die wordt áángeboden. De controles
over wat er al live staat, horen niet hier maar in de schrijfopdracht zelf —
zie regel 2.

**2. Eén transactie, met een vergrendeling op de projectrij.**

Dit is de kern van deze paragraaf, en het punt waarop een eerdere versie van
dit document te optimistisch was.

Eerst lezen wat er live staat, dan beslissen, dan schrijven, is **niet** veilig:
tussen de leesactie en de schrijfactie kan een andere publicatie of een
depublicatie binnenkomen, en dan schrijf je op basis van informatie die niet
meer klopt. Een losse controle vóór een `UPDATE` geeft een gerust gevoel en
geen garantie. Dat geldt ook voor een controle die netjes in de code staat.

Niet alles kan in één SQL-voorwaarde. De compatibiliteitstabel uit paragraaf 3
is TypeScript, geen tabel in de database; de richtingcontrole uit regel 6
vraagt het `version_no` van de nu gepubliceerde versie. Die beoordelingen
gebeuren dus in de applicatie, en precies daarom moeten ze binnen een
vergrendeling vallen. Vandaar deze volgorde, die als geheel één transactie is:

```sql
begin;

-- 1. De afspraak: iedereen die publiceert of depubliceert neemt eerst deze
--    vergrendeling. Zij serialiseert alles wat de live site van dit project
--    kan veranderen.  Levert deze regel GEEN rij op, dan bestaat het project
--    niet meer: meteen terugdraaien, niets schrijven.
select id from projects where id = $pid for update;

-- 2. Lezen wat er nu live staat — betrouwbaar, want niemand anders kan er
--    tussen komen zolang de vergrendeling staat.
select revision, schema_version, source_version_id
  from published_sites
 where project_id = $pid;

-- 3. Beoordelen in de applicatie: bestaat er een rij; klopt expectedRevision;
--    is wat er live staat leesbaar volgens de compatibiliteitstabel; gaat deze
--    publicatie achteruit in versie (regel 6).  Niet goed? -> rollback, niets
--    geschreven.

-- 4. Schrijven, met de controle er nóg een keer in als tweede slot.
insert into published_sites
       (project_id, slug, config, schema_version, source_version_id,
        revision, published_by, published_at)
values ($pid, $slug, $config, $sv, $vid, 1, $uid, now())
    on conflict (project_id) do update
       set slug              = excluded.slug,
           config            = excluded.config,
           schema_version    = excluded.schema_version,
           source_version_id = excluded.source_version_id,
           revision          = published_sites.revision + 1,
           published_by      = excluded.published_by,
           published_at      = now()
     where published_sites.revision       = $expectedRevision
       and published_sites.schema_version <= $currentSchemaVersion
 returning revision;

commit;
```

Wat deze opdracht in stap 4 wél en niet doet, is nagemeten op PostgreSQL 16:

| Geval | Uitkomst |
|---|---|
| Geen rij, `expectedRevision = 0` | `INSERT`, revisie 1 |
| Rij met revisie 1, `expectedRevision = 1` | `UPDATE`, revisie 2 |
| Rij met revisie 2, `expectedRevision = 1` | **nul rijen, geen fout** |
| Rij met revisie 2, `expectedRevision = 0` | **nul rijen, geen fout** |
| Twee gelijktijdige eerste publicaties | precies één rij, revisie 1; de ander nul rijen |

- **Eén rij terug**: gepubliceerd, en `returning` geeft de nieuwe revisie.
- **Nul rijen terug**: er is niets geschreven. Geen uitzondering, geen
  gedeeltelijke wijziging — de bestaande momentopname staat er onveranderd.

De voorwaarde `schema_version <= $currentSchemaVersion` in stap 4 is **geen
compatibiliteitscontrole**. Zij vangt alleen het grofste geval (een nieuwer
formaat dan deze build kent). Of een lágere versie werkelijk leesbaar is, hangt
af van de compatibiliteitstabel en van een onafgebroken migratiepad, en dat
wordt in stap 3 beoordeeld — onder de vergrendeling, niet ervoor.

**Bestaat het project niet meer, dan stopt het hier.** Tussen de
eigenaarscontrole uit regel 1 en de vergrendeling kan het project zijn
verwijderd. Geeft `select ... for update` geen rij terug, dan draait de
transactie terug en is het antwoord hetzelfde als bij een project dat niet van
deze gebruiker is — geen onderscheid tussen "bestaat niet" en "niet van jou",
zoals paragraaf 2 voorschrijft. In de logregel staat de werkelijke reden
(`project_not_found`) wél, want die is voor ons.

Zonder die controle zou de `INSERT` verderop stuklopen op de foreign key. Dat
is op zichzelf niet onveilig — er komt geen rij — maar het levert een
databasefout op in plaats van een gecontroleerd antwoord, en dat hoort een
bezoeker of een editor nooit te zien.

**Gaat er ergens iets mis, dan gaat alles terug.** Elke weigering en elke
onverwachte databasefout eindigt in `rollback`, niet in een gedeeltelijk
geschreven toestand:

| Wat er misgaat | Wat er gebeurt |
|---|---|
| Configuratie komt niet door migratie of `parseStoredConfig` | `rollback`, niets geschreven |
| Project verdwenen bij de vergrendeling | `rollback`, antwoord als bij geen toegang |
| Beoordeling in stap 3 wijst af | `rollback` met de bijbehorende foutcode |
| Stap 4 raakt nul rijen | `rollback`; de bestaande rij is onaangeroerd |
| Dubbele `slug` (sleutelconflict 23505) | PostgreSQL breekt de transactie af; wij vangen de fout, draaien terug en antwoorden `slug_taken` |
| Elke andere databasefout | `rollback`, een gecontroleerd antwoord naar buiten, de details alleen in de log |

Na een `rollback` zijn `config`, `revision`, `source_version_id` en
`published_at` van de bestaande momentopname exact wat ze waren. Een
sleutelconflict verdient hier aparte aandacht: zodra PostgreSQL er een
signaleert, staat de hele transactie in foutstand en kan er binnen diezelfde
transactie niets meer worden gedaan dan terugdraaien. Opnieuw proberen met een
andere slug is dus een nieuwe transactie, met een nieuwe vergrendeling en een
nieuwe lezing van de stand — nooit een voortzetting van de oude.

Vallen er meer schrijfacties onder dezelfde publicatie (later bijvoorbeeld een
regel in een publicatielogboek), dan horen die binnen dezelfde transactie.
Neveneffecten die **buiten** de database vallen — een e-mail, het leegmaken van
een cache, een bericht aan een andere dienst — gebeuren pas ná een geslaagde
`commit`. Een `rollback` kan ze niet terugnemen, dus mogen ze niet eerder.

**3. De eerste publicatie, en twee tegelijk.**

Als een project nog niets gepubliceerd heeft, is er geen rij. De afspraak is
dan: **`expectedRevision = 0` betekent "ik ga ervan uit dat er nog niets live
staat".** De opdracht hierboven handelt dat af zonder extra code:

| Situatie | Wat er gebeurt |
|---|---|
| Geen rij, `expectedRevision = 0` | `INSERT`, `revision` wordt 1 |
| Rij bestaat, revisie klopt | `UPDATE`, `revision` gaat met één omhoog |
| Rij bestaat, revisie klopt niet | `WHERE` is onwaar → nul rijen, niets gewijzigd |
| Geen rij, maar `expectedRevision > 0` | De `INSERT` zou slagen en een verwijderde publicatie weer tot leven wekken. Dit is het geval dat stap 3 hierboven afvangt — zie "Depubliceren volgt dezelfde afspraak". |

Twee eigenaren (of twee tabbladen) die tegelijk voor het eerst publiceren,
komen allebei op het `INSERT`-pad uit. `project_id` is de primaire sleutel, dus
de database laat er maar één door:

1. de eerste transactie voegt de rij toe en legt vast;
2. de tweede loopt tegen hetzelfde sleutelconflict aan, wacht tot de eerste
   klaar is, en komt dan in het `DO UPDATE`-deel terecht;
3. daar staat inmiddels `revision = 1`, terwijl de tweede `expectedRevision = 0`
   meegaf. De `WHERE` is onwaar, er worden nul rijen geraakt.

Resultaat: één publicatie, geen uitzondering, geen stille overschrijving. De
tweede krijgt `stale_revision` te zien en de melding dat er inmiddels iets live
staat. Dit gedeelte zou zelfs zonder vergrendeling kloppen, puur door de
primaire sleutel — maar de vergrendeling uit regel 2 blijft verplicht, omdat de
beoordelingen in stap 3 die bescherming niet hebben.

**Depubliceren volgt dezelfde afspraak.**

Een publicatie weghalen is een `DELETE` op `published_sites`, en dat is óók een
wijziging van de live site. Zonder gedeelde vergrendeling ontstaat dit gat, dat
op PostgreSQL 16 is nagespeeld en bevestigd:

1. de editor leest revisie 2 en de eigenaar klikt op "publiceren";
2. ondertussen haalt dezelfde eigenaar (of een tweede tabblad) de site offline;
3. de opdracht van stap 1 komt aan, vindt géén rij, neemt het `INSERT`-pad, en
   **zet de verwijderde site weer online** met revisie 1.

Daarom geldt: **`publish()` en `unpublish()` nemen allebei als eerste
`select id from projects where id = $pid for update`, op dezelfde projectrij.**
Doet één van de twee dat niet, dan is de garantie weg — niet een beetje
zwakker, maar weg. Hetzelfde geldt voor elke latere functie die
`published_sites` aanraakt.

Twee regels die daarbij horen:

- **De vergrendeling is het eerste wat er gebeurt**, vóór het lezen van de
  bestaande rij. Een lezing die ervóór plaatsvindt, is al verouderd op het
  moment dat de vergrendeling er is.
- **Alles wat van de actuele live stand afhangt, gebeurt binnen diezelfde
  transactie**: bestaat er een rij, klopt `expectedRevision`, is de live versie
  leesbaar, en gaat deze publicatie achteruit in versie. Geen van die vier mag
  buiten de transactie worden voorbereid en daarbinnen alleen nog worden
  toegepast.

Met die vergrendeling verloopt hetzelfde scenario zo: de depublicatie wacht tot
de publicatie klaar is (of andersom), en wie als tweede aan de beurt komt leest
de werkelijke stand binnen zijn eigen vergrendeling. Staat er dan geen rij meer
terwijl `expectedRevision > 0`, dan weigert stap 3 met `stale_revision` en komt
er niets online.

Het verwijderen van het hele project vraagt geen extra afspraak: de
foreign-keyrelatie `on delete cascade` zorgt dat PostgreSQL de projectrij
tijdens een lopende `INSERT` niet kan verwijderen, en dat de gepubliceerde rij
meegaat zodra het project verdwijnt.

De `slug` heeft een eigen unieke sleutel over de hele tabel. Claimen twee
projecten dezelfde slug, dan is dat een sleutelconflict op een ándere kolom dan
waarop `ON CONFLICT` is gericht; de database geeft dan een fout die de
serverfunctie opvangt en vertaalt naar `slug_taken`. Dat is een nette melding
aan de eigenaar — niet een serverfout en niet een nieuwe poging met een
verzonnen slug.

**4. Nul rijen betekent: weigeren, niet opnieuw proberen.**

Raakt de opdracht nul rijen, dan is er intussen iets veranderd, of mag deze
build niet schrijven. **De beslissing is dan al genomen en staat vast.** Pas
daarna leest de server de bestaande rij nog één keer — uitsluitend om de juiste
melding te kiezen:

| Wat de nalezing laat zien | Melding |
|---|---|
| `schema_version` hoger dan deze build ondersteunt | `unsupported_version` |
| Rij volgens de compatibiliteitstabel niet leesbaar | `incompatible_config` |
| Anders (de revisie is opgeschoven) | `stale_revision` |

Die nalezing is er voor de woordkeuze, nooit om alsnog te schrijven. Opnieuw
proberen met de revisie die je net hebt opgehaald is precies de stille
overschrijving die deze hele paragraaf moet voorkomen. Een nieuwe poging komt
van de eigenaar, die eerst ziet wat er nu live staat.

**5. Een oudere build raakt een nieuwere momentopname niet aan.**

De voorwaarde `published_sites.schema_version <= $currentSchemaVersion` in de
opdracht is het slot. Draait er na een teruggedraaide uitrol een oudere build
en staat er een momentopname die door een nieuwere build is geschreven, dan
raakt de opdracht nul rijen en blijft de klantsite staan zoals hij stond. Die
build kan niet aantonen dat zij begrijpt wat er live staat, dus mag zij het
niet vervangen. **Niet downgraden, niet "het is maar een publicatie", niet
alsnog overschrijven.**

Een lagere versie is daarmee nog niet veilig. `schema_version <= $current`
zegt alleen dat het nummer niet uit de toekomst komt; of die versie werkelijk
te lezen is, staat in de compatibiliteitstabel en hangt af van een onafgebroken
migratiepad. Die beoordeling kan niet in SQL — de tabel is TypeScript — en
gebeurt daarom in stap 3 van regel 2, binnen de vergrendeling. Is de live
momentopname volgens die tabel niet leesbaar, of ontbreekt het migratiepad, dan
breekt de transactie af met `incompatible_config` en wordt er niets geschreven.

Dit is het enige punt waar de bescherming niet uit één SQL-voorwaarde komt maar
uit de combinatie van vergrendeling, beoordeling en voorwaardelijke
schrijfopdracht. Die drie horen bij elkaar; wie de vergrendeling weglaat omdat
"de `WHERE` het toch wel afvangt", haalt de bescherming weg zonder dat een
losse test dat per se laat zien.

De logregel bevat alleen metadata: project-id, de aangetroffen schemaversie, de
ondersteunde versie, de reden. Nooit de configuratie.

**6. Terugzetten naar een oudere versie mag, maar alleen als de eigenaar het
bewust doet.**

Teruggaan naar versie 7 is een normale publicatie met dat versie-id. Het
verschil met een ongeluk zit in twee dingen, want de revisiecontrole alleen is
hier niet genoeg.

De revisiecontrole vangt een **gelijktijdige** wijziging. Zij vangt níét het
geval dat hieronder het gevaarlijkst is: een tabblad dat gisteren is
opengelaten met versie 7 in beeld, waar sindsdien niemand anders heeft
gepubliceerd. De revisie klopt dan nog gewoon, en op "publiceren" klikken zou
versie 12 stilletjes terugdraaien naar 7. Daarom:

- **Richting wordt gecontroleerd.** Is het `version_no` van de aangeboden versie
  **lager** dan dat van de nu gepubliceerde `source_version_id`, dan weigert de
  serverfunctie tenzij de opdracht expliciet `intent: 'rollback'` meegeeft.
  Zonder die vlag is het antwoord `unintended_rollback`, met in de melding welke
  versie nu live staat en welke werd aangeboden.
- **De eigenaar bevestigt de actuele revisie.** `expectedRevision` is verplicht
  en wordt nooit door de server ingevuld. Er is geen "publiceer de nieuwste"-pad
  dat de revisie zelf opzoekt, want dan is er niets meer om tegenaan te
  controleren. Bij een rollback toont de interface eerst wat er live staat en
  waar naartoe wordt teruggegaan, en pas de bevestiging dáárvan levert de
  revisie die meegaat.
- **Een verouderde opdracht wordt nooit automatisch een rollback.** Weigert een
  publicatie met `stale_revision`, dan is het antwoord niet "dan maar met de
  nieuwe revisie" en ook niet "dan maar als rollback". De opdracht vervalt; de
  eigenaar begint opnieuw met wat er nu werkelijk staat.
- **`intent: 'rollback'` slaat niets over.** De vlag zegt één ding: dat
  achteruitgaan in versie hier de bedoeling is. Alle andere controles gelden
  onverkort — eigenaarschap via `getOwnedProject`, de versie die bij dít
  project hoort, een configuratie die door migratie en `parseStoredConfig`
  komt, de compatibiliteit van wat er live staat, de vergrendeling uit regel 2,
  en de door de eigenaar bevestigde `expectedRevision`. Een rollback met een
  verouderde revisie is nog steeds `stale_revision`; een rollback door iemand
  die geen eigenaar is, bestaat niet. De vlag is een toestemming voor de
  richting, geen sleutel die langs het slot gaat.

> Ook hier geldt het onderscheid uit paragraaf 3: deze regels zijn beleid, maar
> wat beschermt is de voorwaardelijke opdracht aan de database en de controle in
> `publish()`. Een afspraak die niet in die opdracht of die functie staat,
> bestaat niet.

---

## 5. Acceptatiecriteria voor fase 2

Fase 2 is af als dit allemaal aantoonbaar werkt:

1. **Magic-link-authenticatie staat er vóór projectopslag.** Zonder sessie is er
   geen eigenaar, en een project zonder eigenaar is een gat. Opslaan is niet
   bereikbaar zonder ingelogd te zijn.
2. **Een eigenaar slaat zijn project op en leest het terug**: dezelfde
   configuratie, dezelfde weergave als in de preview.
3. **Een andere ingelogde gebruiker krijgt dat project niet**, ook niet met het
   juiste id, en ook niet via het versie-id.
4. **Een oudere ondersteunde configuratie** wordt gemigreerd, gevalideerd en
   gerenderd — aangetoond met een vastgelegde voorbeeldconfiguratie van een
   oudere versie. Daar hoort een tweede test bij: een configuratie met een veld
   dat voor die versie **expliciet als te negeren is toegestaan**, levert exact
   dezelfde gerenderde pagina op als dezelfde configuratie zónder dat veld. Dat
   is het bewijs dat negeren hier niets verandert; zonder dat bewijs mag het
   veld niet in `ignorableFields` staan.
5. **Een configuratie die deze build niet veilig kan lezen, wordt geweigerd** —
   gecontroleerd, met de foutpagina, een logregel met alleen metadata en geen
   poging tot downgraden. Twee gevallen, allebei met een eigen test:
   - een **nieuwer of onbekend versienummer**, of een versie zonder
     onafgebroken migratiepad → `unsupported_version`;
   - een **onbekend veld of bloktype dat niet bij naam is toegestaan** voor de
     aangetroffen versie → `incompatible_config`. Ook als de rest van de
     configuratie klopt, en ook als het veld onschuldig lijkt.
6. **Het migratiepad heeft geen gaten en elke compatibiliteitsregel is
   onderbouwd.** Een test loopt van de oudste ondersteunde versie tot
   `CURRENT_SCHEMA_VERSION` en controleert dat er voor elke tussenliggende stap
   een migratiefunctie én een compatibiliteitsregel bestaat. Een tweede test
   controleert dat elke `provenBy`-verwijzing naar bestaande tests wijst die in
   dezelfde run slagen — een regel met een verwijzing naar een test die niet
   bestaat of faalt, laat de build falen.
7. **De leeslaag dwingt het beleid zelf af, niet het document.** Een test voert
   een configuratie met een niet-toegestaan onbekend veld rechtstreeks door
   `parseStoredConfig` en controleert dat die weigert — ook als de
   compatibiliteitstabel elders zou beweren dat de versie leesbaar is. Het
   beleid staat op papier; de weigering staat in de code, en alleen die telt.
8. **Een geweigerde bewerking laat de live site precies zoals hij was.** Dit
   is de algemene regel achter de criteria hierna, en geldt voor élke
   weigering (`stale_revision`, `unsupported_version`, `incompatible_config`,
   `unintended_rollback`, `slug_taken`). Drie tests:
   - er stáát iets live en de bewerking wordt geweigerd → dezelfde `config`,
     dezelfde `revision`, dezelfde `published_at`, en de publieke route toont
     hem nog steeds normaal;
   - er staat nog níéts live en de eerste publicatie wordt geweigerd →
     `published_sites` blijft leeg, geen half aangemaakte rij, en de publieke
     route geeft netjes "niet gevonden";
   - na een geweigerde bewerking is de transactie volledig teruggedraaid: ook
     bijbehorende rijen (later bijvoorbeeld een publicatielogboek) ontbreken,
     en neveneffecten buiten de database zijn niet uitgevoerd.

   De test draait voor élke weigergrond afzonderlijk, inclusief een
   `slug_taken` (die binnen PostgreSQL de transactie in foutstand zet) en een
   kunstmatig opgewekte databasefout. In alle gevallen zijn `config`,
   `revision`, `source_version_id` en `published_at` van de bestaande
   momentopname naderhand exact gelijk aan daarvoor.
9. **Twee gelijktijdige publicaties overschrijven elkaar niet stilletjes.** Een
   test voert twee publicaties uit die van dezelfde `expectedRevision`
   uitgaan. De eerste slaagt en verhoogt `revision`; de tweede faalt met
   `stale_revision` en verandert niets. Er is geen volgorde waarin het werk van
   de eerste publicatie ongemerkt verdwijnt.
10. **Twee gelijktijdige eerste publicaties leveren één live site op.** Een
   test start twee publicaties voor hetzelfde project terwijl er nog geen rij
   bestaat, allebei met `expectedRevision = 0`. Precies één slaagt en krijgt
   `revision = 1`; de ander faalt met `stale_revision` zonder uitzondering en
   zonder tweede rij. De test controleert ook dat de live configuratie die van
   de geslaagde publicatie is, en draait in beide volgordes. Een variant met
   twee projecten die dezelfde `slug` claimen levert `slug_taken` op in plaats
   van een serverfout.
11. **Een verouderde opdracht maakt geen rij aan die er niet hoort.** Twee
   tests:
   - een project is gedepubliceerd (rij weg) en er komt een publicatieopdracht
     binnen die nog van `expectedRevision = 2` uitgaat → geweigerd met
     `stale_revision`, `published_sites` blijft leeg, en de publieke route
     blijft "niet gevonden" geven;
   - het hele **project** is verwijderd tussen de eigenaarscontrole en de
     vergrendeling in → `publish()` stopt bij de vergrendeling, draait terug,
     geeft hetzelfde antwoord als bij geen toegang, en er ontstaat geen rij in
     `published_sites`. De test controleert ook dat er geen ruwe databasefout
     naar buiten komt.
12. **Gelijktijdig publiceren en depubliceren levert nooit een herrezen site
   op.** Een test laat een publicatie en een depublicatie van hetzelfde project
   elkaar overlappen, in beide volgordes. De uitkomst is altijd één van twee:
   de site staat live met een revisie die hoger is dan de vorige, óf er staat
   niets live. Wat niet mag voorkomen is een rij die ná de depublicatie is
   aangemaakt door een opdracht die van de oude stand uitging. De test
   controleert daarnaast dat beide functies de vergrendeling op de projectrij
   nemen — een variant waarin `unpublish()` die vergrendeling overslaat, moet
   de test laten falen.
13. **Een verouderde opdracht wordt geen rollback, en een rollback slaat niets
   over.** Vier tests:
   - een publicatie met een `expectedRevision` die niet meer klopt faalt met
     `stale_revision`; er wordt niets geschreven en er volgt geen automatische
     nieuwe poging met de actuele revisie;
   - een publicatie van een **oudere** versie terwijl de revisie toevallig nog
     wél klopt (het opengelaten-tabblad-geval) faalt met `unintended_rollback`
     zolang `intent: 'rollback'` ontbreekt. Dezelfde opdracht mét die vlag
     slaagt, verhoogt `revision` en zet de oudere versie bewust live;
   - een rollback **mét** de vlag maar met een verouderde `expectedRevision`
     faalt alsnog met `stale_revision`;
   - een rollback **mét** de vlag door iemand die geen eigenaar is, faalt met
     dezelfde uitkomst als elke andere niet-eigenaar: geen toegang, geen
     onderscheid tussen "bestaat niet" en "niet van jou", en niets geschreven.
14. **Een incompatibele live momentopname wordt niet overschreven.** Drie
   tests, alle drie met de bestaande rij onveranderd achteraf en een logregel
   met alleen metadata:
   - de live rij heeft een `schema_version` hoger dan de
     `CURRENT_SCHEMA_VERSION` van de draaiende build → `unsupported_version`;
   - de live rij heeft een versie die volgens de compatibiliteitstabel niet
     leesbaar is, of waarvoor het migratiepad ontbreekt → `incompatible_config`,
     óók als het versienummer lager is dan `CURRENT_SCHEMA_VERSION`;
   - de aangeboden configuratie zelf komt niet door migratie en
     `parseStoredConfig` → geweigerd vóór enige schrijfactie.
15. **De gelijktijdigheidstests draaien verplicht tegen PostgreSQL.** De
   criteria 9 tot en met 12 gaan over wat de database doet als twee
   transacties elkaar raken: vergrendelingen, primaire sleutels en de
   voorwaardelijke schrijfopdracht. Een in-memory implementatie bootst dat na
   en bewijst daarmee hooguit dat de nabootsing klopt. Deze tests zijn daarom
   verplicht tegen een echte PostgreSQL (een wegwerpdatabase die de test zelf
   opzet). De in-memory variant mag de sequentiële gevallen draaien; de
   gelijktijdige gevallen worden daar overgeslagen met een expliciete reden,
   niet stilzwijgend.
16. **Geen publicatiepad schrijft zonder de vergrendeling.** Elke functie die
   `published_sites` aanraakt — vandaag `publish()` en `unpublish()`, morgen
   wat er bij komt — neemt als eerste
   `select id from projects where id = $pid for update` op dezelfde
   projectrij, en doet alle controles die van de live stand afhangen binnen
   diezelfde transactie. Dit wordt op twee manieren bewaakt, en het is de
   moeite waard om te weten wat elk van de twee wél en niet aantoont.

   **a. Een test met een opzettelijk onveilige variant.** Naast de echte
   `unpublish()` staat een variant die de vergrendeling overslaat. De test
   toont aan dat díé variant de gelijktijdigheidstests (9 tot en met 12) laat
   falen. Daarmee is bewezen dat die tests de vergrendeling werkelijk meten en
   niet toevallig slagen — en omdat ze tegen een echte PostgreSQL draaien
   (criterium 15), meten ze het gedrag van de database en niet dat van een
   nabootsing. Wat deze test **niet** bewijst, is dat een toekomstige, nog niet
   geschreven schrijfplek veilig zal zijn; hij zegt alleen iets over de paden
   die hij uitvoert.

   **b. Een geautomatiseerde controle op de broncode.** Die faalt zodra er een
   schrijfactie op `published_sites` bestaat buiten de functies die de
   vergrendeling nemen. De controle dekt alle plekken waar nu naar die tabel
   wordt geschreven — `insert`, `update`, `delete`, `upsert` — én de
   databasehelpers die zo'n schrijfactie namens een ander kunnen uitvoeren, dus
   ook een generieke query- of repository-functie waar de tabelnaam
   doorheen kan komen. Komt er een nieuwe schrijfplek bij, dan faalt de
   controle totdat die plek aantoonbaar dezelfde vergrendelings- en
   transactieregels volgt: eerst `for update` op de projectrij, alle
   stand-afhankelijke controles binnen dezelfde transactie, en terugdraaien bij
   elke weigering. "Aantoonbaar" betekent dat de nieuwe plek wordt opgenomen in
   de tests 9 tot en met 12, niet dat iemand hem op de lijst zet.

   **Wat dit is en wat het niet is.** Deze controle is een praktische waarborg
   voor de implementatie zoals die er nu uitziet, geen formele garantie. Zij
   leest onze eigen broncode; PostgreSQL zelf blokkeert een schrijfactie zonder
   vergrendeling niet. Wie met een ander hulpmiddel, een migratiescript of een
   directe verbinding naar de tabel schrijft, komt er langs zonder dat een test
   dat merkt. Afdwinging in de database — bijvoorbeeld door alle schrijfacties
   door één functie te laten lopen die de vergrendeling zelf neemt — is een
   mogelijke verbetering voor later, geen onderdeel van deze fase. Dit
   document kiest er bewust voor dat nu niet te bouwen, en het risico liever te
   benoemen dan te verhullen.
17. **Geen enkele test heeft productiecredentials nodig.** De tests draaien tegen
   een in-memory implementatie van de opslaglaag, of tegen een wegwerpdatabase
   die de test zelf opzet. Daarvoor krijgt de opslag een smalle interface
   (`ProjectStore`) met twee implementaties: één op Postgres, één in het
   geheugen. De regels uit dit document gelden voor allebei, en de
   toegangstests draaien tegen allebei.

Aanvullend, als kwaliteitsgrens: de controles uit fase 1 blijven groen
(typecheck, lint, de volledige testsuite, productiebuild).

---

## Wijziging op besluit 0001

Besluit 0001 zegt onder punt 5: *"Uitbreiden zonder versiesprong: een nieuw
optioneel veld of een nieuw bloktype verhoogt de versie niet."*

Zo kan het niet blijven staan. Fase 1 heeft `.strict()` op elk object gezet, en
dat is nagemeten: een configuratie met één extra veld bovenin wordt geweigerd
met `Unrecognized key`, en een blok met een onbekend `type` laat de hele
configuratie afkeuren. Een oudere build zou een nieuwere configuratie dus niet
kunnen lezen — terwijl besluit 0001 juist belooft dat een gepubliceerde site
nooit stukgaat doordat wij het formaat veranderen.

**Die regel wordt hierbij vervangen door paragraaf 3 van dit document.** Een
additieve wijziging mag de versie alleen gelijk houden als aan álle drie deze
voorwaarden is voldaan:

1. de compatibiliteit is **vooraf expliciet vastgelegd** — het veld of bloktype
   staat bij naam in `ignorableFields` of `ignorableBlockTypes` voor de versie
   waar het om gaat, en de leeslaag kent die regel dus al vóórdat de eerste rij
   met dat veld bestaat;
2. de vereiste tests uit `provenBy` bestaan en slagen, en tonen aan dat negeren
   geen inhoud of bedoeling verandert;
3. de wijziging raakt de betekenis of de zichtbaarheid van bestaande inhoud
   niet. Doet ze dat wel, dan is ze per definitie niet additief en gaat de
   versie omhoog.

Ontbreekt één van de drie, dan is het geen additieve wijziging maar een
versiesprong, en weigert een oudere build de configuratie gecontroleerd.

**Onbekende velden en bloktypes worden nooit automatisch overgeslagen.** Een
build mag niet zelf vaststellen dat iets wat hij niet kent wel ongevaarlijk zal
zijn; hij heeft die informatie niet. Alles wat niet bij naam is toegestaan,
leidt tot weigeren.

Let op het verschil tussen beleid en handhaving. Dit document en de
compatibiliteitstabel zijn **beleid**: ze zeggen wat mag. Wat het veilig maakt,
is de **leeslaag die het afdwingt** — `parseStoredConfig` weigert standaard
alles wat niet in de tabel staat, ongeacht wat hier geschreven is. Een regel in
een document of een verwijzing naar een test is op zichzelf geen maatregel; de
maatregel is de code die bij elk ingelezen record weigert. Komt dit document
ooit in strijd met de leeslaag, dan is dat een fout in de leeslaag óf in dit
document — nooit een reden om de weigering te omzeilen.

De rest van besluit 0001 blijft ongewijzigd van kracht.

---

## Wat hier bewust niet staat

De keuze van regio en back-upbeleid, eigen domeinen, de editor zelf, hoe het
AI-model straks configuraties aanlevert, betalingen, en de deellinks met token
uit besluit 0001 §4. Die komen in eigen besluiten.

## Open vragen

Deze hoeven niet beantwoord te zijn om met fase 2 te beginnen, maar ze komen
terug zodra er betalende klanten zijn:

1. **Is een magic link genoeg op termijn?** Voor de eerste versie wel: geen
   wachtwoorden om te lekken. Maar wie zijn mailbox kwijt is, is zijn account
   kwijt; een tweede methode of een herstelprocedure wordt op enig moment nodig.
2. **Mag een slug veranderen?** Zo ja, dan hoort de oude slug te blijven bestaan
   als doorverwijzing, anders breken links die klanten al gedeeld hebben.
3. **Verwijderen: direct weg of eerst een prullenbak?** `on delete cascade`
   verwijdert nu ook de hele geschiedenis en haalt de site offline. Dat is
   duidelijk, maar onomkeerbaar.
4. **Waar staan de gegevens?** Voor Nederlandse ondernemers is een EU-regio het
   verstandigst; dat moet bij het aanmaken van het Supabase-project gekozen
   worden en is achteraf lastig te veranderen.
5. **Hoeveel versies bewaren we?** Alleen-toevoegen groeit onbeperkt. Bij 20 KB
   per versie duurt het lang voor dat pijn doet, maar er komt een moment voor
   een opruimbeleid.
