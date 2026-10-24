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

  /* Dit was eerst een terugval op 'midnight-craft'. Die is weggehaald: een
     onbekende waarde stil vervangen betekent dat de gebruiker iets anders te
     zien krijgt dan hij in de URL vroeg, zonder melding. Afwijzen is eerlijker
     en houdt het schema de enige poort. */
  it('weigert een thema dat niet bestaat in plaats van er stil een te kiezen', () => {
    const result = briefFromParams({
      name: 'Zaak',
      category: 'barber',
      theme: '../../etc/passwd',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/stijl/i);
  });

  /* Een ontbrekende parameter is geen foute keuze maar géén keuze: dan vullen
     we de standaard van het formulier in. Het verschil met de test hierboven is
     het hele punt. */
  it('vult de standaardstijl in als de parameter helemaal ontbreekt', () => {
    const result = briefFromParams({ name: 'Zaak', category: 'barber' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.brief.theme).toBe('midnight-craft');
  });

  it('weigert een branche die nog geen template heeft, en zegt waarom', () => {
    const result = briefFromParams({
      name: 'Zaak',
      category: 'restaurant',
      theme: 'midnight-craft',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/nog geen ontwerp/i);
  });

  it('weigert een branche die helemaal niet bestaat met een ándere melding', () => {
    const result = briefFromParams({
      name: 'Zaak',
      category: 'ruimtevaart',
      theme: 'midnight-craft',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/uit de lijst/i);
      expect(result.errors.join(' ')).not.toMatch(/nog geen ontwerp/i);
    }
  });

  it('weigert een onzinnig jaartal', () => {
    const result = briefFromParams({
      name: 'Zaak',
      category: 'barber',
      theme: 'midnight-craft',
      since: '20',
    });
    expect(result.ok).toBe(false);
  });
});
