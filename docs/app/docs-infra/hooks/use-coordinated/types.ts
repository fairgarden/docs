import { createMultipleTypes } from '@/functions/createTypes';
import {
  useCoordinated,
  useCoordinatedLocalStorage,
  useCoordinatedPreference,
  createSettleGate,
  useSettleGate,
} from '@fairgarden/docs/useCoordinated';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  useCoordinated,
  useCoordinatedLocalStorage,
  useCoordinatedPreference,
  createSettleGate,
  useSettleGate,
});

export const TypesUseCoordinated = types;
export const TypesUseCoordinatedAdditional = AdditionalTypes;
