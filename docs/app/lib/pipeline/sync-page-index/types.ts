import { createTypes } from '@/functions/createTypes';
import { syncPageIndex } from '@fairgarden/docs/pipeline/syncPageIndex';

export const TypesSyncPageIndex = createTypes(import.meta.url, syncPageIndex);
