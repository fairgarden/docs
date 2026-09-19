import { createTypes } from '@/functions/createTypes';
import { loadServerTypes } from '@fairgarden/docs/pipeline/loadServerTypes';

export const TypesLoadServerTypes = createTypes(import.meta.url, loadServerTypes);
