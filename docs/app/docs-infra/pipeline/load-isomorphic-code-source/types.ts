import { createTypes } from '@/functions/createTypes';
import { createLoadIsomorphicCodeSource } from '@fairgarden/docs/pipeline/loadIsomorphicCodeSource';

export const TypesLoadIsomorphicCodeSource = createTypes(
  import.meta.url,
  createLoadIsomorphicCodeSource,
);
