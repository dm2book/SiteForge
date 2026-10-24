import type { Block } from '@/site/schema';
import { MediaFrame } from '@/site/Media';

/**
 * De bloklbibliotheek: de ENIGE componenten die ooit op een klantsite draaien.
 *
 * Elk component krijgt data die al door het schema is gekomen. Er staat
 * nergens `dangerouslySetInnerHTML` — en de lintregel `react/no-danger` zorgt
 * dat dat zo blijft. Daardoor kan tekst uit een template of (later) uit een
 * AI-antwoord nooit code worden.
 */

function Action({ action, variant }: { action: { label: string; href: string }; variant: 'primary' | 'ghost' }) {
  return (
    <a className={`sf-btn sf-btn-${variant}`} href={action.href}>
      {action.label}
    </a>
  );
}

function Head({ eyebrow, heading, intro }: { eyebrow?: string; heading: string; intro?: string }) {
  return (
    <header className="sf-head">
      {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
      <h2 className="sf-h2">{heading}</h2>
      {intro ? <p className="sf-intro">{intro}</p> : null}
    </header>
  );
}

export function BlockView({ block }: { block: Block }): React.JSX.Element {
  switch (block.type) {
    case 'hero':
      return (
        <section className="sf-section sf-hero" id={block.id}>
          <div className="sf-wrap sf-hero-grid">
            <div className="sf-hero-copy">
              {block.eyebrow ? <p className="sf-eyebrow">{block.eyebrow}</p> : null}
              <h1 className="sf-h1">{block.headline}</h1>
              {block.lead ? <p className="sf-lead">{block.lead}</p> : null}
              {block.note ? (
                <p className="sf-note">
                  <span className="sf-dot" aria-hidden="true" />
                  {block.note}
                </p>
              ) : null}
              <div className="sf-actions">
                {block.primary ? <Action action={block.primary} variant="primary" /> : null}
                {block.secondary ? <Action action={block.secondary} variant="ghost" /> : null}
              </div>
            </div>
            <div className="sf-hero-media">
              <MediaFrame media={block.media} ratio="4 / 5" />
            </div>
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="sf-section sf-section-tight sf-band" id={block.id}>
          <div className="sf-wrap">
            <dl className="sf-stats">
              {block.items.map((s, i) => (
                <div className="sf-stat" key={i}>
                  <dd className="sf-stat-value">{s.value}</dd>
                  <dt className="sf-stat-label">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="sf-section" id={block.id}>
          <div className="sf-wrap">
            <Head eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
            <ul className="sf-gallery">
              {block.items.map((item, i) => (
                <li className="sf-gallery-item" key={i}>
                  <MediaFrame media={item.media} ratio="4 / 5" />
                  {item.caption ? <p className="sf-caption">{item.caption}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'services':
      return (
        <section className="sf-section sf-band" id={block.id}>
          <div className="sf-wrap sf-wrap-narrow">
            <Head eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
            <dl className="sf-rows">
              {block.items.map((s, i) => (
                <div className="sf-row" key={i}>
                  <dt className="sf-row-name">{s.name}</dt>
                  {s.price ? <dd className="sf-row-price">{s.price}</dd> : null}
                  <dd className="sf-row-desc">
                    {s.description}
                    {s.duration ? <span className="sf-row-duration"> · {s.duration}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      );

    case 'team':
      return (
        <section className="sf-section" id={block.id}>
          <div className="sf-wrap">
            <Head eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
            <ul className="sf-team">
              {block.members.map((m, i) => (
                <li className="sf-member" key={i}>
                  <MediaFrame media={m.media} ratio="1 / 1" />
                  <h3 className="sf-member-name">{m.name}</h3>
                  {m.role ? <p className="sf-member-role">{m.role}</p> : null}
                  {m.bio ? <p className="sf-member-bio">{m.bio}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="sf-section sf-band" id={block.id}>
          <div className="sf-wrap">
            <Head heading={block.heading} />
            <ul className="sf-quotes">
              {block.items.map((q, i) => (
                <li key={i}>
                  <blockquote className="sf-quote">
                    <p>{q.quote}</p>
                    <footer>
                      <cite className="sf-quote-author">{q.author}</cite>
                      {q.meta ? <span className="sf-quote-meta"> — {q.meta}</span> : null}
                    </footer>
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case 'hours':
      return (
        <section className="sf-section" id={block.id}>
          <div className="sf-wrap sf-split">
            <div>
              <Head heading={block.heading} />
              <dl className="sf-rows">
                {block.rows.map((r, i) => (
                  <div className="sf-row sf-row-simple" key={i}>
                    <dt className="sf-row-name">{r.day}</dt>
                    <dd className="sf-row-price">{r.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <address className="sf-address">
              {block.address ? <p>{block.address}</p> : null}
              {block.phone ? (
                <p>
                  <a href={`tel:${block.phone.replace(/[^\d+]/g, '')}`}>{block.phone}</a>
                </p>
              ) : null}
              {block.note ? <p className="sf-intro">{block.note}</p> : null}
            </address>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="sf-section sf-cta" id={block.id}>
          <div className="sf-wrap sf-wrap-narrow sf-center">
            <h2 className="sf-h2">{block.heading}</h2>
            {block.lead ? <p className="sf-lead">{block.lead}</p> : null}
            <div className="sf-actions sf-actions-center">
              {block.primary ? <Action action={block.primary} variant="primary" /> : null}
            </div>
            {block.note ? <p className="sf-caption">{block.note}</p> : null}
          </div>
        </section>
      );

    case 'footer':
      return (
        <footer className="sf-footer" id={block.id}>
          <div className="sf-wrap sf-footer-grid">
            <div>
              <p className="sf-footer-name">{block.businessName}</p>
              {block.tagline ? <p className="sf-caption">{block.tagline}</p> : null}
            </div>
            <address className="sf-address">
              {block.address ? <p>{block.address}</p> : null}
              {block.phone ? <p>{block.phone}</p> : null}
            </address>
          </div>
        </footer>
      );

    default:
      return <UnknownBlock block={block} />;
  }
}

/**
 * Het vangnet voor een bloktype dat deze renderer niet kent.
 *
 * Twee lagen, want het probleem heeft twee kanten:
 *
 *  Tijdens het bouwen — de toekenning aan `never` is een COMPILATIEFOUT zodra
 *  er een bloktype aan het schema wordt toegevoegd zonder `case` hierboven.
 *  Eerder gaf de functie dan stilletjes `undefined` terug en verdween de sectie
 *  van de pagina zonder dat iets klaagde; TypeScript keurde dat goed.
 *
 *  Tijdens het draaien — mocht er tóch iets onbekends binnenkomen (bijvoorbeeld
 *  een oude, opgeslagen configuratie na een wijziging), dan verdwijnt het niet
 *  in stilte. In ontwikkeling staat er een zichtbaar kader met het type erbij;
 *  in productie blijft de rest van de site gewoon staan en gaat het naar de
 *  console. Een onbekend blok mag nooit de hele pagina meenemen.
 */
function UnknownBlock({ block }: { block: never }): React.JSX.Element {
  const type = (block as { type?: unknown } | null)?.type;
  const label = typeof type === 'string' ? type : 'onbekend';

  if (process.env.NODE_ENV === 'production') {
    console.error(`[SiteForge] Onbekend bloktype overgeslagen: ${label}`);
    return <></>;
  }

  return (
    <section className="sf-section" aria-label="Onbekend blok">
      <div className="sf-wrap">
        <p className="sf-unknown" role="status">
          Onbekend bloktype: <strong>{label}</strong>. Dit blok staat wel in het schema maar heeft
          geen component in <code>src/blocks/Blocks.tsx</code>.
        </p>
      </div>
    </section>
  );
}
