import { describe, it, expect } from 'vitest';
import {
  ActionSchema,
  BlockSchema,
  SiteConfigSchema,
  ThemeSchema,
  checkHref,
  isColorValue,
  parseSiteConfig,
} from '@/site/schema';
import { FONT_STACKS } from '@/themes/fonts';
import { midnightCraft } from '@/themes/presets';
import { MINIMAL_BLOCKS } from './fixtures';

/**
 * Het schema is de enige poort tussen "iets wat een configuratie beweert te
 * zijn" en een echte pagina. Straks schrijft een AI-model die configuraties;
 * deze tests leggen vast wat er dan NIET doorheen mag.
 */

const config = (blocks: unknown[], over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  meta: {
    businessName: 'Zaak',
    title: 'Zaak — Barbier',
    description: 'Een korte omschrijving van de zaak.',
    locale: 'nl',
  },
  theme: midnightCraft,
  blocks,
  ...over,
});

const hero = (id: string) => ({ ...MINIMAL_BLOCKS.hero, id });

describe('links', () => {
  it('laat alleen veilige vormen door', () => {
    for (const href of [
      '/boeken',
      '/pad/naar/iets?a=1',
      '#boeken',
      'https://voorbeeld.nl/pad',
      'HTTPS://voorbeeld.nl',
      'mailto:info@voorbeeld.nl',
      'tel:+31201234567',
    ]) {
      expect(checkHref(href), href).toMatchObject({ ok: true });
    }
  });

  it('weigert een protocol-relatieve link die van de site af gaat', () => {
    const v = checkHref('//kwaadaardig.example');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/andere website/i);
  });

  it('weigert de backslash-variant, die browsers als // lezen', () => {
    expect(checkHref('/\\kwaadaardig.example').ok).toBe(false);
    expect(checkHref('/pad\\naar').ok).toBe(false);
  });

  it('weigert code vermomd als link', () => {
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      ' javascript:alert(1)',
      'java\tscript:alert(1)',
    ]) {
      expect(checkHref(href).ok, href).toBe(false);
    }
  });

  it('weigert onversleuteld http en inloggegevens in de URL', () => {
    expect(checkHref('http://voorbeeld.nl').ok).toBe(false);
    expect(checkHref('https://gebruiker:geheim@voorbeeld.nl').ok).toBe(false);
  });

  it('weigert een onvolledig webadres en een onvolledig e-mailadres', () => {
    expect(checkHref('https://localhost').ok).toBe(false);
    expect(checkHref('mailto:geen-apenstaartje').ok).toBe(false);
    expect(checkHref('tel:bel-ons').ok).toBe(false);
  });

  it('geeft bij een fout een reden die je kunt doorsturen naar het model', () => {
    const v = checkHref('ftp://voorbeeld.nl/bestand');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/https|mailto|tel/);
  });

  it('weigert het via ActionSchema, niet alleen via de losse functie', () => {
    expect(ActionSchema.safeParse({ label: 'x', href: '//elders.example' }).success).toBe(false);
    expect(ActionSchema.safeParse({ label: 'x', href: '/boeken' }).success).toBe(true);
  });
});

describe('themawaarden', () => {
  it('herkent geldige kleuren', () => {
    for (const c of ['#fff', '#c9a227', '#c9a22780', 'rgb(12, 34, 56)', 'rgba(1, 2, 3, 0.5)']) {
      expect(isColorValue(c), c).toBe(true);
    }
  });

  it('weigert alles wat geen kleur is maar wel CSS', () => {
    for (const c of [
      'url(https://volger.example/pixel.png)',
      'red; } body { display: none',
      'var(--iets)',
      'expression(alert(1))',
      'rgb(999, 0, 0)',
      'red',
      '',
      '#12345',
    ]) {
      expect(isColorValue(c), c).toBe(false);
    }
  });

  it('weigert een thema met een onveilige kleurwaarde', () => {
    const r = ThemeSchema.safeParse({
      ...midnightCraft,
      colorAccent: 'url(https://v.example/p.png)',
    });
    expect(r.success).toBe(false);
  });

  it('staat alleen lettertypen uit de lijst toe', () => {
    expect(
      ThemeSchema.safeParse({ ...midnightCraft, fontBody: FONT_STACKS.condensed }).success,
    ).toBe(true);
    expect(
      ThemeSchema.safeParse({ ...midnightCraft, fontBody: '"</style><script>a</script>"' }).success,
    ).toBe(false);
    expect(ThemeSchema.safeParse({ ...midnightCraft, fontBody: 'Comic Sans MS' }).success).toBe(
      false,
    );
  });

  it('weigert een onbekend veld in het thema', () => {
    expect(ThemeSchema.safeParse({ ...midnightCraft, colorExtra: '#fff' }).success).toBe(false);
  });
});

describe('onbekende velden', () => {
  it('weigert een onbekend veld in een blok in plaats van het stilletjes weg te gooien', () => {
    const r = BlockSchema.safeParse({
      ...MINIMAL_BLOCKS.hero,
      script: '<script>alert(1)</script>',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].code).toBe('unrecognized_keys');
  });

  it('weigert een onbekend veld in een item binnen een blok', () => {
    const r = BlockSchema.safeParse({
      ...MINIMAL_BLOCKS.services,
      items: [{ name: 'Knippen', html: '<b>x</b>' }],
    });
    expect(r.success).toBe(false);
  });

  it('weigert een onbekend veld in meta en op het hoogste niveau', () => {
    expect(parseSiteConfig(config([hero('hero')], { extra: 1 })).ok).toBe(false);
    const metaFout = parseSiteConfig({
      ...config([hero('hero')]),
      meta: { businessName: 'Z', title: 'T', description: 'D', locale: 'nl', tracking: 'x' },
    });
    expect(metaFout.ok).toBe(false);
  });

  it('noemt in de fout welk veld onbekend is', () => {
    const r = parseSiteConfig(config([hero('hero')], { extra: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.message.includes('extra'))).toBe(true);
  });
});

describe('samenhang van de hele pagina', () => {
  it('weigert twee blokken met hetzelfde id', () => {
    const r = parseSiteConfig(config([hero('hero'), { ...MINIMAL_BLOCKS.cta, id: 'hero' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.message.includes('al gebruikt'))).toBe(true);
      expect(r.errors.some((e) => e.path === 'blocks.1.id')).toBe(true);
    }
  });

  it('weigert twee hero-blokken, want dat geeft twee h1-koppen', () => {
    const r = parseSiteConfig(config([hero('hero'), hero('hero-2')]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.message.includes('2 hero-blokken'))).toBe(true);
  });

  it('weigert een pagina zonder hero', () => {
    const r = parseSiteConfig(config([MINIMAL_BLOCKS.cta]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.message.includes('precies één hero'))).toBe(true);
  });

  it('accepteert precies één hero', () => {
    expect(parseSiteConfig(config([hero('hero'), MINIMAL_BLOCKS.cta])).ok).toBe(true);
  });

  it('weigert een anker dat naar een blok wijst dat niet bestaat', () => {
    const r = parseSiteConfig(
      config([{ ...MINIMAL_BLOCKS.hero, primary: { label: 'Boek', href: '#bestaat-niet' } }]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        r.errors.some((e) => e.message.includes('verwijst naar een blok dat niet bestaat')),
      ).toBe(true);
      expect(r.errors.some((e) => e.path === 'blocks.0.primary.href')).toBe(true);
    }
  });

  it('accepteert een anker dat wél naar een blok wijst', () => {
    const r = parseSiteConfig(
      config([
        { ...MINIMAL_BLOCKS.hero, primary: { label: 'Boek', href: '#boeken' } },
        { ...MINIMAL_BLOCKS.cta, id: 'boeken' },
      ]),
    );
    expect(r.ok, r.ok ? '' : JSON.stringify(r.errors)).toBe(true);
  });

  it('weigert een blok-id dat geen anker kan zijn', () => {
    for (const id of ['Mijn Blok', 'blok met spatie', '1blok', 'blok"x', '']) {
      expect(parseSiteConfig(config([hero(id)])).ok, id).toBe(false);
    }
  });

  it('weigert een taalcode die geen taalcode is', () => {
    const r = parseSiteConfig({
      ...config([hero('hero')]),
      meta: { businessName: 'Z', title: 'T', description: 'D', locale: '"><x' },
    });
    expect(r.ok).toBe(false);
  });

  it('noemt bij een onbekend bloktype de types die wél mogen', () => {
    const r = BlockSchema.safeParse({ id: 'x', type: 'carousel' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain('hero');
  });

  it('geeft elke fout een pad en een code, bruikbaar voor een AI-herstelronde', () => {
    const r = parseSiteConfig(config([{ ...MINIMAL_BLOCKS.hero, id: 'Hoofdblok' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      for (const e of r.errors) {
        expect(e.path.length).toBeGreaterThan(0);
        expect(e.code.length).toBeGreaterThan(0);
      }
    }
  });
});
