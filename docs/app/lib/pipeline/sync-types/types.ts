import { createTypes } from '@/functions/createTypes';
import { syncTypes } from '@fairgarden/docs/pipeline/syncTypes';

export const TypesSyncTypes = createTypes(import.meta.url, syncTypes);
