import { notFound } from 'next/navigation';
import { briefFromParams } from '@/lib/params';
import { buildSite } from '@/templates';
import { parseSiteConfig } from '@/site/schema';
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

export default async function RenderPage({ searchParams }: Props) {
  const result = briefFromParams(await searchParams);
  if (!result.ok) notFound();

  const config = buildSite(result.brief);

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
