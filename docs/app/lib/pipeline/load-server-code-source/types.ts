import { createTypes } from '@/functions/createTypes';
import { loadServerCodeSource } from '@fairgarden/docs/pipeline/loadServerCodeSource';

export const TypesLoadServerCodeSource = createTypes(import.meta.url, loadServerCodeSource);
