# SiteForge

Een websitebouwer voor ondernemers: kies je branche, vul je gegevens in en
krijg een complete, professionele website die je daarna zelf aanpast en
publiceert.

> **Status: fase 1 afgerond — het websitecontract is sluitend.** De structuur,
> het barbier-template, de renderer en de responsive preview werken, en het
> schema laat alleen nog configuraties door die ook echt te tekenen zijn.
> AI-generatie, inloggen, opslaan en publiceren zijn nog niet gebouwd.

## Snel starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Andere commando's:

| Commando | Wat het doet |
|---|---|
| `npm run typecheck` | Controleert de types (geen build) |
| `npm run lint` | ESLint over het hele project |
| `npm test` | De testsuite (Vitest) |
| `npm run build` | Productiebuild |
| `npm start` | Draait de productiebuild |

## Wat je kunt proberen

1. Open `/` en vul het formulier in (bedrijfsnaam, plaats, stijl).
2. Je komt op `/preview` met de website in een kader.
3. Wissel tussen **Mobiel / Tablet / Desktop** — dat is een echt iframe, dus de
   media-queries reageren op de framebreedte en niet op een verkleinde kopie.
4. Wissel van stijl op de startpagina en zie dezelfde secties er anders uitzien.

Rechtstreekse voorbeeld-URL:

```
/preview?name=Ledger%20%26%20Blade&city=Amsterdam&category=barber&theme=midnight-craft&since=2011
```

## Hoe het in elkaar zit

De kern van SiteForge is één regel:

> **Een website is data, geen code.**

Een website is een JSON-configuratie die een schema moet doorstaan. Een vaste
set React-componenten tekent die configuratie. Zo kan straks een AI-model de
inhoud aanleveren zonder dat er ooit gegenereerde code op een klantsite draait.

```
formulier  →  brief  →  template  →  SiteConfig  →  [ SCHEMA ]  →  renderer
                                                        ↑
                                      hier komt later het AI-model binnen,
                                      door exact dezelfde poort
```

### Mappen

| Map | Inhoud |
|---|---|
| `src/site/schema.ts` | **Het contract.** Alle blokken en het thema, als Zod-schema. Begin hier. |
| `src/site/SiteRenderer.tsx` | Zet een configuratie om in een pagina; vertaalt het thema naar CSS-variabelen. |
| `src/site/site.css` | De stijlen van gegenereerde sites (geen Tailwind — thema's moeten per klant verschillen). |
| `src/blocks/Blocks.tsx` | De blokcomponenten: de enige code die ooit op een klantsite draait. |
| `src/themes/presets.ts` | Thema's: alleen kleuren, lettertypen en maatvoering. |
| `src/templates/barber.ts` | Het barbier-template: welke secties, in welke volgorde, met welke teksten. |
| `src/templates/text.ts` | Zorgt dat gegenereerde teksten binnen de limieten van het schema blijven. |
| `src/templates/categories.ts` | De enige bron voor welke branches bestaan en welke al een template hebben. |
| `src/themes/fonts.ts` | De lettertypen die een thema mag gebruiken (gesloten lijst). |
| `docs/besluiten/` | Architectuurbesluiten: wat is besloten en waarom. |
| `src/app/` | De applicatie: startpagina, preview, render-route. |
| `tests/` | Schema-, template-, render- en parametertests. |
| `legacy/` | De oorspronkelijke handgemaakte mockup, bewaard als referentie. |

### Drie keuzes die uitleg verdienen

**1. De AI kan geen bloktype verzinnen.** `BlockSchema` is een
`discriminatedUnion` op `type`. Staat een type niet in de lijst, dan faalt de
validatie en bereikt het nooit een pagina.

**2. Geen `dangerouslySetInnerHTML`, nergens.** De ESLint-regel
`react/no-danger` staat op `error`. React zet tekst standaard als tekst neer,
dus `<script>` in een bedrijfsnaam verschijnt letterlijk op het scherm in
plaats van te draaien. Daar is een test voor.

**3. De preview is een iframe.** Alleen zo reageren media-queries op de
framebreedte. In dat iframe draait `/render`, hetzelfde renderpad dat een
gepubliceerde site zal gebruiken — wat je in de preview ziet is dus letterlijk
wat de bezoeker krijgt. Let op: hetzelfde *renderpad*, niet dezelfde *route*.
`/render` haalt de hele configuratie uit de querystring en is daarmee een
prototype; een publieke klantsite wordt straks opgezocht op domein of slug en
alleen getoond als hij gepubliceerd is. Waarom dat onderscheid er moet zijn
staat in [docs/besluiten/0001](docs/besluiten/0001-publicatieroutes-en-toegang.md).

**4. Een template rekent met de limieten van het schema.** Teksten die de naam
van de klant bevatten gaan door `fit()` uit `src/templates/text.ts`: dat kiest
de rijkste variant die nog binnen het veld past. Zo loopt een titel nooit over
— en wat wegvalt is onze eigen opsmuk, nooit de naam van de zaak.

## Nog niet gebouwd

Inloggen · projecten opslaan · de editor · AI-teksten · publiceren op een eigen
adres · betalingen · andere branches dan barbier.
