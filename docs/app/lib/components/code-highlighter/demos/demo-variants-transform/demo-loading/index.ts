import { Counter as InlineCount } from '../inline-count/Counter';
import { Counter as OutputCount } from '../output-count/Counter';
import { createDemoWithVariants } from '../../demo-fallback/createDemo';

export const DemoCounterLoading = createDemoWithVariants(import.meta.url, {
  InlineCount,
  OutputCount,
});
