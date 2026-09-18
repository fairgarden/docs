import { createTypes } from '@/functions/createTypes';
import { loadServerTypesText } from '@fairgarden/docs/pipeline/loadServerTypesText';

export const TypesLoadServerTypesText = createTypes(import.meta.url, loadServerTypesText);
