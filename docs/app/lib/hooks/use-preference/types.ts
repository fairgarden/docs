import { createMultipleTypes } from '@/functions/createTypes';
import { usePreference, usePreferences } from '@fairgarden/docs/usePreference';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  usePreference,
  usePreferences,
});

export const TypesUsePreference = types;
export const TypesUsePreferenceAdditional = AdditionalTypes;
