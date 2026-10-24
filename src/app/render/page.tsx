import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { briefFromParams } from '@/lib/params';
import { buildSite } from '@/templates';
import { parseSiteConfig, type SiteConfig } from '@/site/schema';
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
function resolveConfig(
  params: Record<string, string | string[] | undefined>,
): SiteConfig | null {
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
  if (!config) return { title: 'Website niet gevonden' };

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
    throw new Error(
      `Het template leverde een ongeldige configuratie op: ` +
        parsed.errors.map((e) => `${e.path}: ${e.message}`).join('; '),
    );
  }

  return <SiteRenderer config={parsed.config} />;
}
