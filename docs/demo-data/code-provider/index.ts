import { createDemoGlobal } from '@fairgarden/docs/createDemoData';
import type { DemoGlobalData } from '@fairgarden/docs/createDemoData/types';
import DemoCodeProvider from './DemoCodeProvider';

export const DemoDataCodeProvider: DemoGlobalData = createDemoGlobal(
  import.meta.url,
  DemoCodeProvider,
);
