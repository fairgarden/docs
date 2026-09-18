import { createTypes } from '@/functions/createTypes';
import { useDemoController } from '@fairgarden/docs/useDemoController';

export const TypesUseDemoController = createTypes(import.meta.url, useDemoController);
