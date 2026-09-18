import { createTypes } from '@/functions/createTypes';
import { useSearch } from '@fairgarden/docs/useSearch';

export const TypesUseSearch = createTypes(import.meta.url, useSearch);
