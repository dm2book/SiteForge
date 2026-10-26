import { describeProjectStore } from './helpers/project-store-contract';
import { createMemoryProjectStore } from '@/server/store/memory';

/**
 * De toegangsregels, gedraaid tegen de geheugenimplementatie.
 *
 * Zodra de PostgreSQL-implementatie er is (fase 2, stap 5) komt daar een
 * tweede bestand bij dat exact dezelfde `describeProjectStore` aanroept. Een
 * regel die maar in één van de twee klopt, valt dan meteen op.
 */
describeProjectStore('geheugen', () => createMemoryProjectStore());
