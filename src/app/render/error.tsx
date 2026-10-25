'use client';

/**
 * Wat een bezoeker ziet als er bij het tekenen van een site iets misgaat.
 *
 * Deze route is tegelijk de preview én het renderpad voor straks gepubliceerde
 * klantsites. Een bezoeker van zo'n site mag nooit een stacktrace of een
 * schemafout te zien krijgen: dat is binnenwerk, en het zegt een aanvaller
 * bovendien hoe het systeem in elkaar zit. Next geeft in productie alleen een
 * `digest` door; de echte melding staat in de serverlog.
 *
 * Next geeft deze pagina een HTTP 500, wat klopt: het is onze fout.
 */
export default function RenderError({ error }: { error: Error & { digest?: string } }) {
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
          Deze website kan nu niet worden getoond
        </h1>
        <p style={{ marginTop: '0.75rem', lineHeight: 1.6, opacity: 0.75 }}>
          Er ging iets mis bij het opbouwen van de pagina. Probeer het over een paar minuten
          opnieuw.
        </p>
        {error.digest ? (
          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', opacity: 0.5 }}>
            Foutcode: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
