import type { SiteConfig } from './schema';
import { BlockView } from '@/blocks/Blocks';
import './site.css';

/**
 * De renderer: van gevalideerde configuratie naar een echte pagina.
 *
 * Het thema wordt hier omgezet in CSS-variabelen. Dat is de enige plek waar
 * dat gebeurt, dus een blokcomponent hoeft nooit een kleur te kennen.
 */
export function SiteRenderer({ config }: { config: SiteConfig }) {
  const t = config.theme;
  const style = {
    '--sf-bg': t.colorBg,
    '--sf-surface': t.colorSurface,
    '--sf-surface-raised': t.colorSurfaceRaised,
    '--sf-ink': t.colorInk,
    '--sf-ink-muted': t.colorInkMuted,
    '--sf-accent': t.colorAccent,
    '--sf-accent-ink': t.colorAccentInk,
    '--sf-border': t.colorBorder,
    '--sf-font-heading': t.fontHeading,
    '--sf-font-body': t.fontBody,
    '--sf-radius': `${t.radius}px`,
    '--sf-max': `${t.maxWidth}px`,
  } as React.CSSProperties;

  /* De footer hoort buiten <main>: dat is een eigen landmark (contentinfo).
     Alles daarboven is de inhoud van de pagina. Zonder <main> kan iemand met
     een schermlezer niet in één sprong naar de inhoud — en dat is op een
     klantsite net zo goed een gebrek als op de onze. */
  const footerIndex = config.blocks.findIndex((b) => b.type === 'footer');
  const hasTrailingFooter = footerIndex === config.blocks.length - 1 && footerIndex > 0;
  const mainBlocks = hasTrailingFooter ? config.blocks.slice(0, footerIndex) : config.blocks;
  const afterMain = hasTrailingFooter ? config.blocks.slice(footerIndex) : [];

  return (
    <div className="sf-site" style={style} lang={config.meta.locale}>
      <main>
        {mainBlocks.map((block) => (
          <BlockView key={block.id} block={block} />
        ))}
      </main>
      {afterMain.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
