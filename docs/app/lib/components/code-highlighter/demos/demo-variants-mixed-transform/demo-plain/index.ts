import { Counter as PlainCount } from '../plain-count/Counter';
import { Counter as TypedCount } from '../typed-count/Counter';
import { createDemoWithVariants } from '../../createDemo';

export const DemoMixedCounter = createDemoWithVariants(import.meta.url, {
  PlainCount,
  TypedCount,
});
