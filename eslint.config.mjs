import next from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';

/* eslint-config-next 16 exporteert een kant-en-klare array, geen functie. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'legacy/**', 'next-env.d.ts'] },
  ...next,
  ...coreWebVitals,
  {
    rules: {
      /* De kern van onze veiligheid: de AI levert data, nooit opmaak. Zodra
         ergens innerHTML wordt gezet, kan een gegenereerde string code worden.
         Daarom is dit een fout, geen waarschuwing. */
      'react/no-danger': 'error',
    },
  },
];

export default config;
