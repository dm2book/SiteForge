/**
 * Wat een bezoeker ziet als de opgevraagde site niet bestaat.
 *
 * De standaardpagina van Next zegt "404: This page could not be found" in het
 * Engels, met de naam van het framework erbij. Dat hoort niet op het adres van
 * een ondernemer te staan.
 */
export default function RenderNotFound() {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '36rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          Deze website bestaat niet
        </h1>
        <p style={{ marginTop: '0.75rem', lineHeight: 1.6, opacity: 0.75 }}>
          Controleer het adres, of ga terug naar de vorige pagina.
        </p>
      </div>
    </main>
  );
}
