import { createTypes } from '@/functions/createTypes';
import { loadServerTypesMeta } from '@fairgarden/docs/pipeline/loadServerTypesMeta';

export const TypesLoadServerTypesMeta = createTypes(import.meta.url, loadServerTypesMeta);
