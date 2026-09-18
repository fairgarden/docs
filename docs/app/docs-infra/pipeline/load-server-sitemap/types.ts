import { createMultipleTypes } from '@/functions/createTypes';
import * as loadServerSitemap from '@fairgarden/docs/pipeline/loadServerSitemap';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, loadServerSitemap);

export const TypesLoadServerSitemap = types;
export const TypesLoadServerSitemapAdditional = AdditionalTypes;
