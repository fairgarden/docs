import { createMultipleTypes } from '@/functions/createTypes';
import * as loadServerPageIndex from '@fairgarden/docs/pipeline/loadServerPageIndex';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, loadServerPageIndex);

export const TypesLoadServerPageIndex = types;
export const TypesLoadServerPageIndexAdditional = AdditionalTypes;
