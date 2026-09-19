import { createTypes } from '@/functions/createTypes';
import * as loaderUtils from '@fairgarden/docs/pipeline/loaderUtils';

export const TypesLoaderUtils = createTypes(import.meta.url, loaderUtils);
