import { createTypes } from '@/functions/createTypes';
import { CodeProvider } from '@fairgarden/docs/CodeProvider';

export const TypesCodeProvider = createTypes(import.meta.url, CodeProvider);
