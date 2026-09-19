import { createTypes } from '@/functions/createTypes';
import { useCopier } from '@fairgarden/docs/useCopier';

export const TypesUseCopier = createTypes(import.meta.url, useCopier);
