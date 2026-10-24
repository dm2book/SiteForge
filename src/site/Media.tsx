import type { Media } from './schema';

/**
 * Plaatsvervangende beelden.
 *
 * Er zijn nog geen uploads. De eerste versie gebruikte grote kleurverlopen,
 * maar die lezen als "onaf" in plaats van als ontwerp. Dit is bewust ingetogen:
 * een rustig vlak in de thema-kleur, een fijne diagonale textuur, een dunne
 * accentlijn en een klein label. Zo ziet een site er verzorgd uit zolang de
 * echte foto's ontbreken, zonder te doen alsof er al beeld is.
 *
 * Alles is afgeleid van `seed`, dus server en browser tekenen hetzelfde.
 */
export function MediaFrame({ media, ratio = '4 / 5' }: { media: Media; ratio?: string }) {
  const id = `m${media.seed}`;
  const shift = media.seed % 5;

  const fill =
    media.tone === 'accent'
      ? 'var(--sf-surface-raised)'
      : media.tone === 'neutral'
        ? 'var(--sf-surface)'
        : 'var(--sf-bg)';

  return (
    <svg
      className="sf-media"
      style={{ aspectRatio: ratio }}
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={media.alt}
    >
      <defs>
        {/* Fijne diagonale lijnen: geeft het vlak textuur zonder het vol te maken. */}
        <pattern id={`${id}p`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" stroke="var(--sf-ink)" strokeWidth="1" opacity="0.045" />
        </pattern>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="var(--sf-ink)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--sf-ink)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="500" fill={fill} />
      <rect width="400" height="500" fill={`url(#${id}p)`} />
      <rect width="400" height="500" fill={`url(#${id}v)`} />

      {/* Dunne rand, zodat het vlak een kader heeft in plaats van weg te lopen. */}
      <rect
        x="0.5"
        y="0.5"
        width="399"
        height="499"
        fill="none"
        stroke="var(--sf-ink)"
        strokeOpacity="0.1"
      />

      {/* Eén accentmarkering, links onder. Klein, zodat het detail blijft. */}
      <rect x="28" y={436 + shift * 2} width="34" height="2" fill="var(--sf-accent)" />
      <text
        x="28"
        y={462 + shift * 2}
        fill="var(--sf-ink)"
        fillOpacity="0.42"
        fontSize="13"
        fontFamily="var(--sf-font-body)"
        letterSpacing="1.6"
      >
        FOTO VOLGT
      </text>
    </svg>
  );
}
