import { createTypes } from '@/functions/createTypes';
import { Flower } from '../../components/Flower/Flower';

// The landing page is not part of a documentation section, so keep the loader
// from generating a parent index page for it.
export const TypesFlower = createTypes(import.meta.url, Flower, { excludeFromIndex: true });
