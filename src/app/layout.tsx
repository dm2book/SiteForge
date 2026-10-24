import type { Metadata } from 'next';
import { GOOGLE_FONT_HREF } from '@/themes/presets';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiteForge — websites voor ondernemers',
  description:
    'Kies je branche, vul je gegevens in en krijg een professionele website die je zelf kunt aanpassen.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        {/* Lettertypen voor de gegenereerde sites. Laden ze niet, dan vangt de
            fallback-stack in het thema het op; de site blijft leesbaar. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONT_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
