import { createMultipleTypes } from '@/functions/createTypes';
import {
  CoordinatedLazy,
  createCoordinatedLazy,
  useChunk,
  useCoordinatedFallback,
  useCoordinatedContent,
  useCoordinatedSwap,
  LazyContent,
} from '@fairgarden/docs/CoordinatedLazy';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  CoordinatedLazy,
  createCoordinatedLazy,
  useChunk,
  useCoordinatedFallback,
  useCoordinatedContent,
  useCoordinatedSwap,
  LazyContent,
});

export const TypesCoordinatedLazy = types;
export const TypesCoordinatedLazyAdditional = AdditionalTypes;
