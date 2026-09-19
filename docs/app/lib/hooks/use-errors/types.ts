import { createTypes } from '@/functions/createTypes';
import { useErrors } from '@fairgarden/docs/useErrors';

export const TypesUseErrors = createTypes(import.meta.url, useErrors);
