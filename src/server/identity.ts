import 'server-only';

/**
 * Wie is de gebruiker, en hoe weten we dat zeker?
 *
 * Besluit 0002 zegt dat iedere serverfunctie eerst vaststelt wíé de verzoeker
 * is en pas daarna of die persoon de gevraagde handeling mag doen. Het risico
 * zit in de eerste helft: een `userId` die gewoon uit een formulierveld, een
 * URL of een JSON-body komt, bewíjst niets. Wie dat per ongeluk doorgeeft aan
 * de opslaglaag, heeft een systeem waarin iedereen zich voor een ander kan
 * uitgeven — en dat ziet er in de code precies hetzelfde uit als de goede
 * variant.
 *
 * Daarom is `UserId` geen gewone `string`. Het is een eigen type dat alleen
 * ontstaat door `trustedUserId()` aan te roepen, en die functie hoort op
 * precies één plek te worden gebruikt: in de laag die de sessie controleert
 * (fase 2, stap 3). Overal anders is de compiler het die tegenhoudt dat een
 * willekeurige tekst als gebruiker wordt doorgegeven.
 *
 * Dit vervangt geen authenticatie. Het maakt alleen zichtbaar wáár de
 * vertrouwensbeslissing wordt genomen, zodat die plek te vinden en te
 * beoordelen is in plaats van verspreid door de code te zitten.
 *
 * De regel `import 'server-only'` bovenaan is geen opsmuk: dat pakket laat de
 * BUILD falen zodra deze module vanuit een clientcomponent wordt binnengehaald.
 * In een servercomponent lost het op naar een leeg bestand; in een clientbundel
 * naar een module die meteen een fout gooit. Daarmee is de grens een bouwfout
 * in plaats van een afspraak.
 */

declare const userIdBrand: unique symbol;

/** Een gebruiker-id waarvan is vastgesteld dat hij uit een sessie komt. */
export type UserId = string & { readonly [userIdBrand]: true };

/**
 * Maakt van een tekst een `UserId`.
 *
 * ALLEEN aanroepen vanuit de sessiecontrole. Zie je deze aanroep ergens anders
 * staan, dan is dat een bevinding, geen detail.
 */
export function trustedUserId(idFromVerifiedSession: string): UserId {
  const id = idFromVerifiedSession.trim();
  if (id.length === 0) {
    throw new Error('trustedUserId: een lege gebruiker-id is geen gebruiker');
  }
  return id as UserId;
}

/**
 * Laatste vangnet in de opslaglaag.
 *
 * Het type houdt het bij het compileren tegen, maar JavaScript dat buiten de
 * typecontrole om binnenkomt (een `any` uit een JSON-body, een cast die iemand
 * erdoorheen duwt) niet. Elke lees- en schrijfbewerking controleert daarom ook
 * tijdens het draaien dat er werkelijk een gebruiker is meegegeven.
 */
export function isUsableUserId(value: unknown): value is UserId {
  return typeof value === 'string' && value.trim().length > 0;
}
