import { createMultipleTypes } from '@/functions/createTypes';
import * as UseTypeModule from '@fairgarden/docs/useType';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, UseTypeModule);

export const TypesUseType = types;
export const TypesUseTypeAdditional = AdditionalTypes;
