import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RenderPage, { generateMetadata } from '@/app/render/page';
import PreviewPage from '@/app/preview/page';

/**
 * Tests op routeniveau.
 *
 * Alle bestaande tests keken naar functies en componenten. Daardoor bleef de
 * fout die fase 1 aanleiding gaf onzichtbaar: pas een echt verzoek aan
 * /render liet zien dat een naam van 38 tekens een HTTP 500 gaf. Deze tests
 * roepen de route-componenten aan zoals Next dat doet.
 *
 * Wat we hier vastleggen:
 *  - geldige invoer levert een pagina op;
 *  - ongeldige invoer levert een GECONTROLEERDE 404 op (Next's `notFound()`),
 *    niet een willekeurige uitzondering die als 500 bij de bezoeker belandt.
 */
const params = (o: Record<string, string>) => ({ searchParams: Promise.resolve(o) });

const geldig = {
  name: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

/** Next's `notFound()` gooit een fout met een herkenbare digest. */
function isNotFound(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.includes('404');
}

/** Roept een route aan en zegt wat eruit kwam: pagina, 404, of een crash. */
async function callRoute(
  route: (p: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactNode>,
  query: Record<string, string>,
): Promise<{ kind: 'page'; html: string } | { kind: 'notFound' } | { kind: 'crash'; error: unknown }> {
  try {
    const node = await route(params(query));
    return { kind: 'page', html: renderToStaticMarkup(node) };
  } catch (error) {
    return isNotFound(error) ? { kind: 'notFound' } : { kind: 'crash', error };
  }
}

describe('/render', () => {
  it('tekent een pagina bij geldige invoer', async () => {
    const r = await callRoute(RenderPage, geldig);
    expect(r.kind).toBe('page');
    if (r.kind === 'page') {
      expect(r.html).toContain('Ledger &amp; Blade');
      expect(r.html).toContain('<main>');
    }
  });

  it('geeft een gecontroleerde 404 bij invoer die niet klopt, nooit een crash', async () => {
    const slecht: Record<string, string>[] = [
      {},
      { name: '' },
      { name: 'A' },
      { name: 'Zaak', category: 'bestaat-niet' },
      { name: 'Zaak', category: 'restaurant' },
      { name: 'Zaak', category: 'barber', theme: '../../etc/passwd' },
      { name: 'Zaak', category: 'barber', since: '20' },
      { name: 'a'.repeat(3000), category: 'barber' },
      { name: '<script>alert(1)</script>', category: 'barber', theme: 'onzin' },
    ];
    for (const query of slecht) {
      const r = await callRoute(RenderPage, query);
      expect(r.kind, `invoer ${JSON.stringify(query)} gaf ${r.kind}`).toBe('notFound');
    }
  });

  it('crasht niet bij de naamlengte die eerder een 500 gaf', async () => {
    for (const lengte of [37, 38, 39, 41, 59, 60]) {
      const r = await callRoute(RenderPage, { ...geldig, name: 'a'.repeat(lengte) });
      expect(r.kind, `naamlengte ${lengte}`).toBe('page');
    }
  });

  it('zet de gegevens van de klant in de metadata, ook aan de rand van de limiet', async () => {
    const meta = await generateMetadata(params({ ...geldig, name: 'a'.repeat(41) }));
    expect(String(meta.title)).toContain('a'.repeat(41));
    expect(String(meta.title).length).toBeLessThanOrEqual(60);
    expect(meta.title).not.toBe('Deze website kan niet worden getoond');
  });

  it('houdt tekst tekst: een scriptpoging komt als tekst op de pagina', async () => {
    const r = await callRoute(RenderPage, { ...geldig, name: '<script>alert(1)</script>' });
    expect(r.kind).toBe('page');
    if (r.kind === 'page') {
      expect(r.html).not.toContain('<script>alert(1)</script>');
      expect(r.html).toContain('&lt;script&gt;');
    }
  });
});

describe('/preview', () => {
  it('toont de preview bij geldige invoer', async () => {
    const r = await callRoute(PreviewPage, geldig);
    expect(r.kind).toBe('page');
    if (r.kind === 'page') expect(r.html).toContain('<iframe');
  });

  it('toont een leesbare uitleg bij ongeldige invoer in plaats van te crashen', async () => {
    const r = await callRoute(PreviewPage, { name: '', category: 'restaurant' });
    expect(r.kind).toBe('page');
    if (r.kind === 'page') {
      expect(r.html).toContain('Dit lukte niet');
      expect(r.html).toMatch(/bedrijfsnaam/i);
      // Geen binnenwerk op het scherm.
      expect(r.html).not.toMatch(/Too big|expected string|ZodError/);
    }
  });

  it('laat geen schemafout aan de gebruiker zien bij een lange naam', async () => {
    const r = await callRoute(PreviewPage, { ...geldig, name: 'a'.repeat(41) });
    expect(r.kind).toBe('page');
    if (r.kind === 'page') {
      expect(r.html).not.toContain('klopt niet');
      expect(r.html).not.toMatch(/Too big|expected string/);
      expect(r.html).toContain('<iframe');
    }
  });
});
