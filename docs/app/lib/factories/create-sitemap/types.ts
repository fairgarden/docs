import { createTypes } from '@/functions/createTypes';
import { createSitemap } from '@fairgarden/docs/createSitemap';

export const TypesCreateSitemap = createTypes(import.meta.url, createSitemap);
