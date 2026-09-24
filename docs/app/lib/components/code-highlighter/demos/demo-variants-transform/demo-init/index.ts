import { Counter as InlineCount } from '../inline-count/Counter';
import { Counter as OutputCount } from '../output-count/Counter';
import { createDemoWithVariants } from '../../createDemo';

export const DemoCounterInit = createDemoWithVariants(
  import.meta.url,
  { InlineCount, OutputCount },
  { highlightAfter: 'init' },
);
