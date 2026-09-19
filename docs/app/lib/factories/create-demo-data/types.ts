import { createTypes } from '@/functions/createTypes';
import { createDemoData } from '@fairgarden/docs/createDemoData';

export const TypesCreateDemoData = createTypes(import.meta.url, createDemoData);
