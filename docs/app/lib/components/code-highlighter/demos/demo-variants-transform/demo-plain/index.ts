import { Counter as InlineCount } from '../inline-count/Counter';
import { Counter as OutputCount } from '../output-count/Counter';
import { createDemoWithVariants } from '../../createDemo';

export const DemoCounterPlain = createDemoWithVariants(import.meta.url, {
  InlineCount,
  OutputCount,
});
