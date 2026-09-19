import { createMultipleTypes } from '@/functions/createTypes';
import * as withFairGardenDocs from '@fairgarden/docs/withFairGardenDocs';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, withFairGardenDocs);

export const TypeswithFairGardenDocs = types;
export const TypeswithFairGardenDocsAdditional = AdditionalTypes;
