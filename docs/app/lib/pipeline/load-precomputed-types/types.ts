import { createTypes } from '@/functions/createTypes';
import loadPrecomputedTypes from '@fairgarden/docs/pipeline/loadPrecomputedTypes';

export const TypesLoadPrecomputedTypes = createTypes(import.meta.url, loadPrecomputedTypes);
