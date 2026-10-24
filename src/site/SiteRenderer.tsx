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

  return (
    <div className="sf-site" style={style} lang={config.meta.locale}>
      {config.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
