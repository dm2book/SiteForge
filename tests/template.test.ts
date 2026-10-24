import { describe, it, expect } from 'vitest';
import { buildSite } from '@/templates';
import { parseSiteConfig } from '@/site/schema';
import { THEMES } from '@/themes/presets';
import type { Brief } from '@/lib/brief';

const base: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

describe('het barbier-template', () => {
  it('levert een configuratie die door het schema komt', () => {
    const result = parseSiteConfig(buildSite(base));
    expect(result.ok).toBe(true);
  });

  it('blijft geldig zonder plaats en zonder oprichtingsjaar', () => {
    const result = parseSiteConfig(buildSite({ ...base, city: '', since: '' }));
    expect(result.ok).toBe(true);
  });

  it('blijft geldig bij elk thema', () => {
    for (const theme of Object.keys(THEMES)) {
      const result = parseSiteConfig(buildSite({ ...base, theme } as Brief));
      expect(result.ok, `thema ${theme}`).toBe(true);
    }
  });

  it('gebruikt de ingevulde bedrijfsnaam in titel en footer', () => {
    const config = buildSite({ ...base, businessName: 'De Scherpe Schaar' });
    expect(config.meta.title).toContain('De Scherpe Schaar');
    const footer = config.blocks.find((b) => b.type === 'footer');
    expect(footer && 'businessName' in footer && footer.businessName).toBe('De Scherpe Schaar');
  });

  it('begint met een hero en eindigt met een footer', () => {
    const blocks = buildSite(base).blocks;
    expect(blocks[0].type).toBe('hero');
    expect(blocks[blocks.length - 1].type).toBe('footer');
  });

  it('bevat de secties die een kapperszaak nodig heeft', () => {
    const types = buildSite(base).blocks.map((b) => b.type);
    for (const needed of ['hero', 'gallery', 'services', 'hours', 'cta'] as const) {
      expect(types, `mist ${needed}`).toContain(needed);
    }
  });

  it('bevat geen vage marketingtaal', () => {
    const text = JSON.stringify(buildSite(base)).toLowerCase();
    for (const filler of ['kwaliteit en service', 'wij zijn gepassioneerd', 'niet verder zoeken']) {
      expect(text, `bevat "${filler}"`).not.toContain(filler);
    }
  });
});
