import { createMultipleTypes } from '@/functions/createTypes';
import * as loadIsomorphicCodeVariant from '@fairgarden/docs/pipeline/loadIsomorphicCodeVariant';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, loadIsomorphicCodeVariant);

export const TypesLoadIsomorphicCodeVariant = types;
export const TypesLoadIsomorphicCodeVariantAdditional = AdditionalTypes;
