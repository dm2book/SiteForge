'use client';

import { useState } from 'react';

/**
 * De responsive preview.
 *
 * De site wordt in een <iframe> geladen in plaats van direct op de pagina. Dat
 * is bewust: binnen een iframe reageren CSS-media-queries op de BREEDTE VAN HET
 * FRAME. Zou je het met CSS-schaling nabootsen, dan zie je een verkleinde
 * desktopsite en niet de echte mobiele weergave — precies het verschil dat je
 * wilt controleren.
 */
const DEVICES = [
  { id: 'mobile', label: 'Mobiel', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet', width: 834, height: 1112 },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];

export function DeviceFrame({ src, title }: { src: string; title: string }) {
  const [active, setActive] = useState<DeviceId>('desktop');
  const device = DEVICES.find((d) => d.id === active) ?? DEVICES[2];

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

      {/* Horizontaal scrollbaar, zodat een 1440px-frame ook op een laptop past. */}
      <div className="overflow-x-auto rounded-xl border border-line bg-bg-1 p-3 sm:p-5">
        <div className="mx-auto" style={{ width: device.width, maxWidth: '100%' }}>
          <iframe
            key={device.id}
            src={src}
            title={title}
            width={device.width}
            height={device.height}
            className="block w-full rounded-lg border border-line-2 bg-white"
            style={{ height: device.height, maxHeight: '72vh' }}
            loading="lazy"
          />
        </div>
      </div>

      <p className="text-xs text-faint">
        Toont <strong className="font-medium text-muted">{device.width} × {device.height}</strong>.
        De site in het kader is dezelfde code die straks gepubliceerd wordt.
      </p>
    </div>
  );
}
