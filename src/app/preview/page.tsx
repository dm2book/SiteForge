import Link from 'next/link';
import { briefFromParams } from '@/lib/params';
import { buildSite } from '@/templates';
import { parseSiteConfig } from '@/site/schema';
import { DeviceFrame } from '@/components/DeviceFrame';

/**
 * Het previewscherm: de interface eromheen.
 *
 * De site zelf zit in het iframe (/render). Hier staat alleen wat je ermee
 * kunt doen, plus een eerlijke melding als de invoer niet klopt.
 */
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const result = briefFromParams(params);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20">
        <h1 className="text-2xl font-semibold tracking-tight">Dit lukte niet</h1>
        <p className="mt-3 text-muted">De ingevulde gegevens zijn niet compleet:</p>
        <ul className="mt-4 grid gap-2">
          {result.errors.map((e, i) => (
            <li key={i} className="rounded-lg border border-line-2 bg-bg-1 px-4 py-3 text-sm">
              {e}
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-brand px-6 font-medium text-white"
        >
          Terug naar het formulier
        </Link>
      </main>
    );
  }

  const { brief } = result;
  const config = buildSite(brief);
  const parsed = parseSiteConfig(config);

  const query = new URLSearchParams({
    name: brief.businessName,
    city: brief.city ?? '',
    category: brief.category,
    theme: brief.theme,
    since: brief.since ?? '',
  }).toString();

  return (
    <>
      <a className="skip-link" href="#preview">Direct naar de preview</a>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Site<span className="text-brand">Forge</span>
          </Link>
          <span className="text-faint">/</span>
          <span className="truncate text-sm text-muted">{brief.businessName}</span>
          <Link
            href="/"
            className="ml-auto min-h-10 rounded-lg border border-line-2 px-4 text-sm leading-10 text-muted hover:border-brand hover:text-ink"
          >
            Opnieuw beginnen
          </Link>
        </div>
      </header>

      <main id="preview" className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Je website</h1>
          <p className="mt-2 text-sm text-muted">
            {parsed.ok
              ? `${parsed.config.blocks.length} secties, opgebouwd uit het ${brief.category}-template.`
              : 'De configuratie is helaas ongeldig.'}{' '}
            Bekijk hem op elk formaat voordat je verdergaat.
          </p>
        </div>

        {parsed.ok ? (
          <DeviceFrame src={`/render?${query}`} title={`Preview van ${brief.businessName}`} />
        ) : (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
            <h2 className="font-semibold">De gegenereerde configuratie klopt niet</h2>
            <ul className="mt-3 grid gap-1 text-sm">
              {parsed.errors.map((e, i) => (
                <li key={i}>
                  <code className="text-faint">{e.path}</code> — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <section className="mt-10 rounded-xl border border-line bg-bg-1 p-5">
          <h2 className="font-semibold">Wat hierna komt</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted">
            <li>· Teksten aanpassen in een editor — nog niet gebouwd.</li>
            <li>· Je project opslaan en later heropenen — vereist een database.</li>
            <li>· Publiceren op een eigen adres — latere fase.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
