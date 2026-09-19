import { createMultipleTypes } from '@/functions/createTypes';
import { ChunkProvider, PreloadProvider, usePreload } from '@fairgarden/docs/ChunkProvider';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  ChunkProvider,
  PreloadProvider,
  usePreload,
});

export const TypesChunkProvider = types;
export const TypesChunkProviderAdditional = AdditionalTypes;
