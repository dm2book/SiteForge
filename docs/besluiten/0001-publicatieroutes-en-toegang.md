# Besluit 1 — Hoe een klantwebsite straks publiek komt te staan

**Status:** vastgesteld · **Datum:** 2026-10-25 · **Fase:** 1 (contract betrouwbaar maken)
**Geldt vanaf:** de stap waarin opslag wordt toegevoegd. Er is nu nog geen database en nog geen inlog.

Dit document legt een besluit vast, geen code. Het bestaat omdat de goedkoopste
manier om opslag toe te voegen tegelijk de gevaarlijkste is, en dat wil je
weten vóórdat je begint, niet erna.

---

## De aanleiding

`/render` doet vandaag twee dingen tegelijk. Het is het renderpad van de
preview — de pagina in het iframe — en het is het enige stuk code dat van een
configuratie een echte website maakt. Dat laatste is bewust: wat je in de
preview ziet is letterlijk wat een bezoeker straks krijgt, want het is dezelfde
route.

De route haalt op dit moment alles uit de querystring:

```
/render?name=Ledger%20%26%20Blade&city=Amsterdam&category=barber&theme=midnight-craft
```

Dat werkt prima zolang SiteForge een prototype op een testadres is. Op een echt
domein betekent het drie dingen die je niet wilt:

1. **Iedereen kan elke pagina maken.** Er is geen eigenaar en geen controle, dus
   een willekeurige bezoeker kan `?name=` vullen met de naam van een bank en
   krijgt een verzorgde pagina op jouw domein. Dat is bruikbaar materiaal voor
   oplichting en het is jouw merk dat eronder staat.
2. **Zoekmachines indexeren het.** Elke variant van de querystring is voor Google
   een eigen pagina.
3. **De voor de hand liggende volgende stap is fout.** Zodra er sites in een
   database staan, is `/render?id=abc123` de kortste weg. Daarmee kan iedereen
   die een id raadt of opvangt het concept van een andere klant bekijken. Dit
   is het meest gemaakte beveiligingslek in dit soort producten, en het is
   achteraf duur om te herstellen omdat links, bookmarks en gedeelde URL's
   dan al bestaan.

## Het besluit

### 1. `/render` is een prototype-renderpad, geen publicatieroute

`/render` blijft bestaan voor de preview en voor ontwikkeling, en wordt **niet**
stilzwijgend de publieke route voor klantwebsites. Zodra publicatie er komt,
krijgt `/render` `noindex` en verdwijnt de variant waarin de hele configuratie
uit de querystring komt, of komt die achter een ontwikkelvlag.

### 2. Een publieke website wordt opgezocht op domein of slug, en alleen als hij gepubliceerd is

De publieke route kent één manier om een site te vinden:

- het **domein** van het verzoek (`kapperamsterdam.nl`), of
- een **slug** op een subdomein van SiteForge (`kapper-amsterdam.siteforge.nl`).

De opzoeking levert alleen iets op als de site de status `published` heeft. Een
concept is niet publiek, ook niet met het juiste adres. De gepubliceerde
configuratie is een **momentopname**: publiceren kopieert de configuratie naar
de gepubliceerde versie, zodat verder werken in de editor de live site niet
verandert.

### 3. Editor en concept vereisen inloggen én een eigenaarscontrole op de server

Alles wat een concept laat zien of wijzigen, vereist:

1. een geauthenticeerde gebruiker, en
2. een controle op de server dat die gebruiker eigenaar is van dat project.

Die controle gebeurt in de opzoekfunctie zelf, niet in de pagina eromheen —
anders vergeet iemand hem bij de volgende route. In code betekent dit één
functie `getOwnedProject(userId, projectId)` die `null` teruggeeft als het
project niet van die gebruiker is, en nergens een opzoeking die alleen op
`projectId` werkt.

### 4. Het kennen van een id geeft nooit toegang tot een concept

Een id, een slug of een link is een **aanwijzer**, geen **sleutel**. "Wie de
URL heeft mag kijken" is geen toegangsbeleid; het is de afwezigheid daarvan.

Wil een ondernemer een concept laten zien aan iemand zonder account, dan gaat
dat via een expliciet aangemaakte deellink met een eigen, lang en willekeurig
token, een houdbaarheidsdatum en de mogelijkheid hem in te trekken — en die
link geeft alleen leesrecht. Dat is iets anders dan het project-id, en het
staat in een eigen tabel.

### 5. Opgeslagen configuraties dragen een schemaversie, met een migratiepad

Elke opgeslagen configuratie bewaart `schema_version` als eigen kolom, naast de
configuratie zelf. De regels:

- **Lezen:** een site met een oudere versie wordt bij het laden door een
  migratiefunctie gehaald (`migrate(config, from, to)`), en pas daarna door het
  schema gevalideerd. Een gepubliceerde site mag nooit stukgaan doordat wij het
  formaat hebben veranderd.
- **Uitbreiden zonder versiesprong:** een nieuw optioneel veld of een nieuw
  bloktype verhoogt de versie niet.
- **Wél een versiesprong:** als een bestaand veld een andere betekenis krijgt of
  verdwijnt. Dan komt er een migratiestap bij en gaat de versie met één omhoog.
- **Blokken vervangen in plaats van verbouwen:** moet een blok wezenlijk
  anders, dan komt er een nieuw type (`hero2`) naast het oude. Oude sites
  blijven zo renderen zonder migratie.
- **Versies zijn alleen-toevoegen:** elke opslag schrijft een nieuwe rij in een
  versietabel in plaats van de vorige te overschrijven. Teruggaan naar gisteren
  is dan gratis, en je kunt zien wat er veranderd is.

## Wat dit nu al betekent

- De huidige preview-URL met parameters blijft werken; hij is deelbaar en
  overleeft een herlaadactie, en dat is in deze fase nuttig.
- Er wordt nu **geen** opzoeking op id gebouwd, ook niet "alvast".
- Zodra opslag erbij komt, is de eerste stap de opzoekfunctie met
  eigenaarscontrole, en pas daarna de pagina die hem gebruikt.

## Wat hier bewust niet staat

Welke database, welke inlogmethode en hoe domeinen gekoppeld worden. Dat zijn
latere keuzes; ze veranderen niets aan de regels hierboven.
