import { createTypes } from '@/functions/createTypes';
import { createLazySourceEnhancer } from '@fairgarden/docs/pipeline/createLazySourceEnhancer';

export const TypesCreateLazySourceEnhancer = createTypes(import.meta.url, createLazySourceEnhancer);
