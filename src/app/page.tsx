import Link from 'next/link';
import { CATEGORIES, CATEGORY_IDS } from '@/templates/categories';
import { THEME_LIST } from '@/themes/presets';

/**
 * De startpagina: uitleg plus het generatieformulier.
 *
 * Het formulier is een gewoon HTML-formulier met `method="get"` naar /preview.
 * Daardoor werkt het zonder JavaScript, is het toetsenbordvriendelijk en is het
 * resultaat een deelbare URL. Pas als er echt interactie nodig is, komt er
 * client-side code bij.
 */
export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#genereren">Direct naar het formulier</a>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Site<span className="text-brand">Forge</span>
          </span>
          <span className="rounded-full border border-line-2 px-3 py-1 text-xs text-muted">
            Vroege versie
          </span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pt-14 pb-10 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Websitebouwer voor ondernemers
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Een vakkundige website,
            <br />
            zonder zelf te bouwen.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Kies je branche, vul een paar gegevens in en bekijk direct een complete website.
            Je past hem daarna zelf aan en publiceert hem wanneer je er klaar voor bent.
          </p>
        </section>

        <section id="genereren" className="mx-auto max-w-5xl px-5 pb-20">
          <div className="rounded-2xl border border-line bg-bg-1 p-5 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">Maak je website</h2>
            <p className="mt-1 text-sm text-muted">
              Alles kun je later aanpassen. Er wordt nog niets opgeslagen.
            </p>

            <form method="get" action="/preview" className="mt-7 grid gap-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Bedrijfsnaam
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="organization"
                    placeholder="Ledger &amp; Blade"
                    className="min-h-12 rounded-lg border border-line-2 bg-bg-2 px-4 text-ink placeholder:text-faint focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="city" className="text-sm font-medium">
                    Plaats <span className="font-normal text-faint">(optioneel)</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    maxLength={60}
                    autoComplete="address-level2"
                    placeholder="Amsterdam"
                    className="min-h-12 rounded-lg border border-line-2 bg-bg-2 px-4 text-ink placeholder:text-faint focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Branche
                  </label>
                  <select
                    id="category"
                    name="category"
                    defaultValue="barber"
                    className="min-h-12 rounded-lg border border-line-2 bg-bg-2 px-4 text-ink focus:border-brand focus:outline-none"
                  >
                    {CATEGORY_IDS.map((id) => (
                      <option key={id} value={id} disabled={!CATEGORIES[id].available}>
                        {CATEGORIES[id].label}
                        {CATEGORIES[id].available ? '' : ' — binnenkort'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-faint">
                    Alleen barbier/kapsalon heeft nu een template. De rest volgt.
                  </p>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="since" className="text-sm font-medium">
                    Opgericht in <span className="font-normal text-faint">(optioneel)</span>
                  </label>
                  <input
                    id="since"
                    name="since"
                    inputMode="numeric"
                    pattern="(19|20)[0-9]{2}"
                    maxLength={4}
                    placeholder="2011"
                    className="min-h-12 rounded-lg border border-line-2 bg-bg-2 px-4 text-ink placeholder:text-faint focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <fieldset className="grid gap-3">
                <legend className="mb-1 text-sm font-medium">Stijl</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {THEME_LIST.map((theme, i) => (
                    <label
                      key={theme.id}
                      className="flex cursor-pointer gap-3 rounded-lg border border-line-2 bg-bg-2 p-4 hover:border-brand has-checked:border-brand has-checked:bg-bg-3"
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={theme.id}
                        defaultChecked={i === 0}
                        className="mt-1 accent-brand"
                      />
                      <span>
                        <span className="block text-sm font-medium">{theme.name}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted">
                          {theme.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="submit"
                  className="min-h-12 rounded-lg bg-brand-strong px-7 font-semibold text-white transition hover:bg-brand-2"
                >
                  Bekijk mijn website
                </button>
                <Link
                  href="/preview?name=Ledger%20%26%20Blade&city=Amsterdam&category=barber&theme=midnight-craft&since=2011"
                  className="text-sm text-muted underline underline-offset-4 hover:text-ink"
                >
                  Of bekijk eerst een voorbeeld
                </Link>
              </div>
            </form>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-faint">
            Wat je krijgt is nu nog opgebouwd uit een vast branchetemplate. De AI die de teksten
            per zaak schrijft komt in een volgende stap — en die levert alleen gecontroleerde
            gegevens aan, nooit code die op je website draait.
          </p>
        </section>
      </main>
    </>
  );
}
