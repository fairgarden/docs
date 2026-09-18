import { createTypes } from '@/functions/createTypes';
import { useCode } from '@fairgarden/docs/useCode';

export const TypesUseCode = createTypes(import.meta.url, useCode);
