import { createTypes } from '@/functions/createTypes';
import { useUrlHashState } from '@fairgarden/docs/useUrlHashState';

export const TypesUseUrlHashState = createTypes(import.meta.url, useUrlHashState);
