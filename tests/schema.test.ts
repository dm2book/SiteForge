import { describe, it, expect } from 'vitest';
import { parseSiteConfig, BlockSchema, ActionSchema, BLOCK_TYPES } from '@/site/schema';
import { buildBarberSite } from '@/templates/barber';
import type { Brief } from '@/lib/brief';

const brief: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

describe('de poort: het schema houdt alles tegen wat niet klopt', () => {
  it('accepteert een onbekend bloktype niet', () => {
    const result = BlockSchema.safeParse({ id: 'x', type: 'script-injectie', code: 'alert(1)' });
    expect(result.success).toBe(false);
  });

  /* Deze test beweerde eerder de bloktypes te controleren maar assereerde
     `typeof type === 'string'` — altijd waar. Nu controleert hij wat de naam
     belooft: dat BLOCK_TYPES volledig is én dat het barbier-template er niet
     buiten kleurt. De rendering per type staat in blocks.test.tsx. */
  it('somt BLOCK_TYPES élk type op dat het schema accepteert', () => {
    const inTemplate = new Set(buildBarberSite(brief).blocks.map((b) => b.type));
    for (const type of inTemplate) {
      expect(BLOCK_TYPES, `"${type}" ontbreekt in BLOCK_TYPES`).toContain(type);
    }
    // Negen blokken in het schema, negen in de lijst: geen stille gaten.
    expect(new Set(BLOCK_TYPES).size).toBe(BLOCK_TYPES.length);
    expect(BLOCK_TYPES.length).toBe(9);
  });

  it('weigert een link met een javascript:-protocol', () => {
    const bad = ActionSchema.safeParse({ label: 'Klik', href: 'javascript:alert(1)' });
    expect(bad.success).toBe(false);

    const good = ActionSchema.safeParse({ label: 'Boek', href: '#boeken' });
    expect(good.success).toBe(true);
  });

  it('eist een alternatieve tekst bij elke afbeelding', () => {
    const result = BlockSchema.safeParse({
      id: 'h',
      type: 'hero',
      headline: 'Kop',
      media: { kind: 'placeholder', seed: 1, tone: 'dark' },
    });
    expect(result.success).toBe(false);
  });

  it('geeft leesbare fouten terug in plaats van een uitzondering', () => {
    const result = parseSiteConfig({ schemaVersion: 1, meta: {}, theme: {}, blocks: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('path');
      expect(result.errors[0]).toHaveProperty('message');
    }
  });
});
