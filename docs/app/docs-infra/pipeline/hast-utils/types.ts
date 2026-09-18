import { createMultipleTypes } from '@/functions/createTypes';
import * as hastUtils from '@fairgarden/docs/pipeline/hastUtils';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, hastUtils);

export const TypesHastUtils = types;
export const TypesHastUtilsAdditional = AdditionalTypes;
