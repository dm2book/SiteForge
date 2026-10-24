import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Zonder dit blijft elke gerenderde component in document.body staan en ziet de
 * volgende test óók de vorige. Dat gaf een valse fout ("twee h1-elementen") op
 * een pagina die er maar één heeft. Testing Library ruimt zichzelf alleen
 * automatisch op als vitest `globals: true` gebruikt; wij importeren expliciet,
 * dus doen we het hier ook expliciet.
 */
afterEach(cleanup);
