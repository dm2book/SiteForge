import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BLOCK_TYPES, BlockSchema, isBlockType, parseSiteConfig, type Block } from '@/site/schema';
import { BlockView } from '@/blocks/Blocks';
import { MINIMAL_BLOCKS } from './fixtures';
import { midnightCraft } from '@/themes/presets';
import { SiteRenderer } from '@/site/SiteRenderer';

/**
 * Regressietests bij bevinding H2 en M1.
 *
 * De oude test ("kent precies de bloktypes die we documenteren") beweerde dit
 * te dekken maar controleerde alleen `typeof type === 'string'` — altijd waar.
 * Hij sloeg dus nooit aan, ook niet als een bloktype ontbrak in BLOCK_TYPES of
 * geen component had.
 */
describe('het blokregister is sluitend', () => {
  it('kent een voorbeeld voor élk type uit BLOCK_TYPES', () => {
    for (const type of BLOCK_TYPES) {
      expect(MINIMAL_BLOCKS[type], `geen voorbeeld voor "${type}"`).toBeDefined();
    }
    expect(Object.keys(MINIMAL_BLOCKS).sort()).toEqual([...BLOCK_TYPES].sort());
  });

  it('accepteert het schema elk van die voorbeelden', () => {
    for (const type of BLOCK_TYPES) {
      const result = BlockSchema.safeParse(MINIMAL_BLOCKS[type]);
      expect(result.success, `schema wees "${type}" af`).toBe(true);
    }
  });

  it('rendert élk bloktype zichtbare inhoud, geen leegte', () => {
    for (const type of BLOCK_TYPES) {
      const { container, unmount } = render(<BlockView block={MINIMAL_BLOCKS[type]} />);
      expect(container.firstChild, `"${type}" rendert niets`).not.toBeNull();
      expect(container.textContent?.trim().length ?? 0, `"${type}" is leeg`).toBeGreaterThan(0);
      unmount();
    }
  });

  it('herkent isBlockType alleen echte types', () => {
    expect(isBlockType('hero')).toBe(true);
    expect(isBlockType('raketaandrijving')).toBe(false);
  });
});

describe('een onbekend bloktype verdwijnt niet in stilte', () => {
  /* Buiten TypeScript om een onmogelijke waarde maken — precies de situatie
     die kan ontstaan bij een oude, opgeslagen configuratie na een wijziging. */
  const vreemd = { id: 'b-?', type: 'nog-niet-bestaand' } as unknown as Block;

  it('weigert het schema hem al bij de poort', () => {
    expect(BlockSchema.safeParse(vreemd).success).toBe(false);
    const config = parseSiteConfig({
      schemaVersion: 1,
      meta: { businessName: 'Z', title: 'T', description: 'D', locale: 'nl' },
      theme: midnightCraft,
      blocks: [vreemd],
    });
    expect(config.ok).toBe(false);
  });

  it('toont de renderer buiten productie een zichtbare waarschuwing', () => {
    const { container } = render(<BlockView block={vreemd} />);
    expect(container.textContent).toContain('Onbekend bloktype');
    expect(container.textContent).toContain('nog-niet-bestaand');
  });

  it('slaat de renderer hem in productie over zonder de pagina te breken', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      vi.stubEnv('NODE_ENV', 'production');
      const { container } = render(
        <SiteRenderer
          config={{
            schemaVersion: 1,
            meta: { businessName: 'Zaak', title: 'T', description: 'D', locale: 'nl' },
            theme: midnightCraft,
            blocks: [vreemd, MINIMAL_BLOCKS.footer],
          }}
        />,
      );
      // Het onbekende blok is weg, maar de footer staat er nog: de pagina leeft.
      expect(container.textContent).not.toContain('Onbekend bloktype');
      expect(container.textContent).toContain('Zaak');
      expect(spy).toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      spy.mockRestore();
    }
  });
});
