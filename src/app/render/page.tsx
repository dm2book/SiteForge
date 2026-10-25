import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { briefFromParams } from '@/lib/params';
import { buildSite } from '@/templates';
import { formatConfigErrors, parseSiteConfig, type SiteConfig } from '@/site/schema';
import { SiteRenderer } from '@/site/SiteRenderer';

/**
 * De kale website, zonder enige SiteForge-interface eromheen.
 *
 * Dit is wat de preview in zijn iframe laadt, en het is dezelfde route die
 * straks een gepubliceerde site serveert. Eén renderpad, dus wat je in de
 * preview ziet is letterlijk wat de bezoeker krijgt.
 */
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Bouwt de configuratie en valideert hem.
 *
 * Zowel `generateMetadata` als de pagina zelf hebben hem nodig. Next roept de
 * twee los van elkaar aan, dus dit draait tweemaal per verzoek — dat is nu
 * goedkoop (het template is een pure functie) en wordt straks één opzoeking in
 * de database.
 */
function resolveConfig(params: Record<string, string | string[] | undefined>): SiteConfig | null {
  const brief = briefFromParams(params);
  if (!brief.ok) return null;

  const parsed = parseSiteConfig(buildSite(brief.brief));
  return parsed.ok ? parsed.config : null;
}

/**
 * De titel en omschrijving van de KLANT, niet die van SiteForge.
 *
 * Dit ontbrak: het template rekende `meta.title` en `meta.description` keurig
 * uit, er was zelfs een test op, maar ze kwamen nooit in de `<head>`. Elke
 * gegenereerde site droeg daardoor de titel van de bouwer zelf — wat bij
 * publicatie betekent dat Google iedere klantsite als "SiteForge" indexeert.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const config = resolveConfig(await searchParams);
  /* Neutraal gehouden: deze titel verschijnt zowel bij een onbekende site als
     bij een configuratie die we niet kunnen tonen. Hij verraadt niets over
     wat er precies misging. */
  if (!config) return { title: 'Deze website kan niet worden getoond', robots: { index: false } };

  const { title, description, businessName } = config.meta;
  return {
    title,
    description,
    openGraph: { title, description, siteName: businessName, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function RenderPage({ searchParams }: Props) {
  const params = await searchParams;
  const brief = briefFromParams(params);
  if (!brief.ok) notFound();

  const config = buildSite(brief.brief);

  /* Het template bouwt de configuratie, maar hij gaat nog steeds door dezelfde
     poort als straks een AI-antwoord. Zo merken we het meteen als een template
     iets oplevert wat het schema niet toestaat. */
  const parsed = parseSiteConfig(config);
  if (!parsed.ok) {
    /* Dit hoort niet te gebeuren: sinds `templates/text.ts` schrijft een
       template binnen de limieten van het schema. Gebeurt het tóch, dan is het
       onze fout en niet die van de bezoeker. De details gaan naar de serverlog;
       de bezoeker krijgt via error.tsx een rustige pagina zonder stacktrace,
       want een foutmelding uit het binnenwerk hoort niet op een klantsite. */
    console.error(
      '[SiteForge] Ongeldige configuratie op /render:\n' + formatConfigErrors(parsed.errors),
    );
    throw new Error('CONFIG_INVALID');
  }

  return <SiteRenderer config={parsed.config} />;
}
