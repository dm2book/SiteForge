import { describe, it, expect } from 'vitest';
import { briefFromParams } from '@/lib/params';

describe('brief uit URL-parameters', () => {
  it('leest een complete set parameters', () => {
    const result = briefFromParams({
      name: 'Ledger & Blade',
      city: 'Amsterdam',
      category: 'barber',
      theme: 'linen-editorial',
      since: '2011',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.brief.theme).toBe('linen-editorial');
  });

  it('weigert een lege bedrijfsnaam met een leesbare melding', () => {
    const result = briefFromParams({ name: '', category: 'barber' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/bedrijfsnaam/i);
  });

  it('valt terug op een bestaand thema als er onzin wordt meegegeven', () => {
    const result = briefFromParams({ name: 'Zaak', category: 'barber', theme: '../../etc/passwd' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.brief.theme).toBe('midnight-craft');
  });

  it('weigert een branche die nog geen template heeft', () => {
    const result = briefFromParams({ name: 'Zaak', category: 'restaurant' });
    expect(result.ok).toBe(false);
  });

  it('weigert een onzinnig jaartal', () => {
    const result = briefFromParams({ name: 'Zaak', category: 'barber', since: '20' });
    expect(result.ok).toBe(false);
  });
});
