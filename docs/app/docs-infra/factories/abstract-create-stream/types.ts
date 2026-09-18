import { createMultipleTypes } from '@/functions/createTypes';
import { abstractCreateStream, createStreamFactory } from '@fairgarden/docs/abstractCreateStream';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  abstractCreateStream,
  createStreamFactory,
});

export const TypesAbstractCreateStream = types;
export const TypesAbstractCreateStreamAdditional = AdditionalTypes;
