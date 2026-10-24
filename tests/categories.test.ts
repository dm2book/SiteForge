import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_IDS,
  AVAILABLE_CATEGORY_IDS,
  isAvailableCategory,
} from '@/templates/categories';
import { TEMPLATE_BUILDERS } from '@/templates';
import { briefFromParams } from '@/lib/params';

/**
 * Regressietest bij bevinding M2.
 *
 * "Welke branches bestaan" stond op drie plekken. Gevolg: een URL met
 * `category=restaurant` gaf "Kies een branche.", terwijl de gebruiker wel
 * degelijk een bestaande branche koos.
 */
describe('branches hebben één bron', () => {
  it('heeft voor elke beschikbare branche ook echt een template', () => {
    for (const id of AVAILABLE_CATEGORY_IDS) {
      expect(TEMPLATE_BUILDERS[id], `geen template voor "${id}"`).toBeTypeOf('function');
    }
  });

  it('biedt geen templates aan voor branches die niet beschikbaar heten', () => {
    expect(Object.keys(TEMPLATE_BUILDERS).sort()).toEqual([...AVAILABLE_CATEGORY_IDS].sort());
  });

  it('toont elke branche uit de lijst in het formulier', () => {
    expect(CATEGORY_IDS.length).toBe(Object.keys(CATEGORIES).length);
    for (const id of CATEGORY_IDS) expect(CATEGORIES[id].label.length).toBeGreaterThan(2);
  });

  it('onderscheidt "bestaat niet" van "nog geen ontwerp"', () => {
    const onzin = briefFromParams({
      name: 'Zaak',
      category: 'ruimtevaart',
      theme: 'midnight-craft',
    });
    expect(onzin.ok).toBe(false);
    if (!onzin.ok) expect(onzin.errors.join(' ')).toMatch(/uit de lijst/i);

    const nogNiet = briefFromParams({
      name: 'Zaak',
      category: 'restaurant',
      theme: 'midnight-craft',
    });
    expect(nogNiet.ok).toBe(false);
    if (!nogNiet.ok) {
      expect(nogNiet.errors.join(' ')).toMatch(/nog geen ontwerp/i);
      expect(nogNiet.errors.join(' ')).toContain('Restaurant');
    }
  });

  it('herkent isAvailableCategory alleen branches met een template', () => {
    expect(isAvailableCategory('barber')).toBe(true);
    expect(isAvailableCategory('restaurant')).toBe(false);
    expect(isAvailableCategory('bestaat-niet')).toBe(false);
  });
});
