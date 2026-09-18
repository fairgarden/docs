import { createTypes } from '@/functions/createTypes';
import enhanceCodeTypes from '@fairgarden/docs/pipeline/enhanceCodeTypes';

export const TypesEnhanceCodeTypes = createTypes(import.meta.url, enhanceCodeTypes);
