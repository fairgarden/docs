import { createTypes } from '@/functions/createTypes';
import { loadServerCodeMeta } from '@fairgarden/docs/pipeline/loadServerCodeMeta';

export const TypesLoadServerCodeMeta = createTypes(import.meta.url, loadServerCodeMeta);
