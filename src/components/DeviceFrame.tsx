'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * De responsive preview.
 *
 * De site wordt in een <iframe> geladen in plaats van direct op de pagina. Dat
 * is bewust: binnen een iframe reageren CSS-media-queries op de BREEDTE VAN HET
 * FRAME. Zou je het met CSS-schaling van de inhoud nabootsen, dan zie je een
 * verkleinde desktopsite en niet de echte mobiele weergave.
 *
 * ── Wat hier eerder fout ging ─────────────────────────────────────────────
 * De wrapper had `width: device.width` én `maxWidth: '100%'`. Die tweede wint
 * altijd, dus het iframe kromp gewoon mee met het venster: op een scherm van
 * 1280px was "Desktop 1440px" in werkelijkheid 1070px breed, en het
 * onderschrift beweerde onderwijl 1440. Je zag dus een andere indeling dan het
 * label aangaf — precies het tegenovergestelde van wat deze component moet doen.
 *
 * ── Hoe het nu werkt ──────────────────────────────────────────────────────
 * Het iframe krijgt zijn echte pixelmaat. Past die niet, dan verkleinen we het
 * hele frame met `transform: scale()`. Daarbij blijft de LAYOUT-breedte 1440px
 * — media-queries reageren op het iframe, niet op het beeldscherm — en wordt
 * alleen het resultaat kleiner getekend. Het onderschrift noemt de schaal, dus
 * het label kan niet meer liegen.
 */
const DEVICES = [
  { id: 'mobile', label: 'Mobiel', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet', width: 834, height: 1112 },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];

export function DeviceFrame({ src, title }: { src: string; title: string }) {
  const [active, setActive] = useState<DeviceId>('desktop');
  const [available, setAvailable] = useState<number | null>(null);
  const holder = useRef<HTMLDivElement>(null);

  const device = DEVICES.find((d) => d.id === active) ?? DEVICES[2];

  /* Een breedte van 0 is geen meting maar een nog niet uitgevoerde layout
     (verborgen tab, eerste frame, testomgeving zonder layout-engine). Zouden we
     die overnemen, dan werd de schaal 0 en verdween het frame. */
  const measure = useCallback(() => {
    const width = holder.current?.clientWidth ?? 0;
    if (width > 0) setAvailable(width);
  }, []);

  useEffect(() => {
    measure();
    if (!holder.current || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(holder.current);
    return () => observer.disconnect();
  }, [measure]);

  /* Vóór de eerste meting schalen we niet: liever even te groot dan een sprong
     van klein naar groot zodra de meting binnen is. */
  const scale = available === null ? 1 : Math.min(1, available / device.width);
  const scaled = scale < 0.999;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Schermformaat">
        {DEVICES.map((d) => {
          const selected = d.id === active;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive(d.id)}
              aria-pressed={selected}
              className={`min-h-10 rounded-lg border px-4 text-sm transition ${
                selected
                  ? 'border-brand bg-brand/15 text-ink'
                  : 'border-line-2 text-muted hover:border-brand hover:text-ink'
              }`}
            >
              {d.label}
              <span className="ml-2 text-xs text-faint">{d.width}px</span>
            </button>
          );
        })}
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Openen in nieuw tabblad
        </a>
      </div>

      {/* `min-w-0` is hier geen opsmuk maar noodzakelijk. Een grid-item is
          standaard zo breed als zijn inhoud (`min-width: auto`), dus zonder dit
          groeide deze doos mee met het iframe van 1440px. De meting hieronder
          las dan 1440 beschikbaar, concludeerde dat er niets geschaald hoefde
          te worden, en de preview liep buiten het scherm — met "op ware
          grootte" eronder. Empirisch nagemeten in Chromium op 900px breed. */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-bg-1 p-3 sm:p-5">
        {/* We meten op een doos ZONDER eigen padding. Meten we op de rand
            hierboven, dan tellen we de padding mee en rekenen we de preview
            een paar pixels te breed. */}
        <div ref={holder}>
          {/* Deze doos reserveert de GESCHAALDE ruimte, zodat de pagina eronder
            niet verspringt; het frame erin houdt zijn echte maat. */}
          <div
            className="mx-auto overflow-hidden"
            style={{
              width: device.width * scale,
              height: Math.min(device.height, 720) * scale,
            }}
          >
            <iframe
              key={device.id}
              src={src}
              title={title}
              width={device.width}
              height={Math.min(device.height, 720)}
              /* Een `ring` in plaats van een `border`: met box-sizing
                 border-box telt een rand mee in de breedte, waardoor de site
                 binnen het frame 1438px meet in plaats van de beloofde 1440.
                 Een ring staat buiten de layout. */
              className="block rounded-lg bg-white ring-1 ring-line-2"
              style={{
                width: device.width,
                height: Math.min(device.height, 720),
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-faint">
        Toont{' '}
        <strong className="font-medium text-muted">
          {device.width} × {Math.min(device.height, 720)}
        </strong>
        {scaled ? (
          <> — op {Math.round(scale * 100)}% weergegeven omdat er minder ruimte is.</>
        ) : (
          <> op ware grootte.</>
        )}{' '}
        De site in het kader is dezelfde code die straks gepubliceerd wordt.
      </p>
    </div>
  );
}
