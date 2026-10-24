import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteRenderer } from '@/site/SiteRenderer';
import { buildSite } from '@/templates';
import { parseSiteConfig } from '@/site/schema';
import type { Brief } from '@/lib/brief';

const brief: Brief = {
  businessName: 'Ledger & Blade',
  city: 'Amsterdam',
  category: 'barber',
  theme: 'midnight-craft',
  since: '2011',
};

function renderSite() {
  const parsed = parseSiteConfig(buildSite(brief));
  if (!parsed.ok) throw new Error('configuratie ongeldig in test');
  return render(<SiteRenderer config={parsed.config} />);
}

describe('de renderer', () => {
  it('tekent de site zonder te crashen', () => {
    const { container } = renderSite();
    expect(container.querySelector('.sf-site')).not.toBeNull();
  });

  it('heeft precies één h1', () => {
    renderSite();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('geeft elke afbeelding een toegankelijke naam', () => {
    renderSite();
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(2);
    }
  });

  it('zet het thema om in CSS-variabelen', () => {
    const { container } = renderSite();
    const root = container.querySelector('.sf-site') as HTMLElement;
    expect(root.style.getPropertyValue('--sf-accent')).toBe('#c9a227');
  });

  it('rendert tekst als tekst, nooit als opmaak', () => {
    const parsed = parseSiteConfig(buildSite({ ...brief, businessName: '<script>x</script>Zaak' }));
    if (!parsed.ok) throw new Error('configuratie ongeldig');
    const { container } = render(<SiteRenderer config={parsed.config} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>x</script>Zaak');
  });
});
