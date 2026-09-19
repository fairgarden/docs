import 'server-only';

import {
  createDemoFactory,
  createDemoWithVariantsFactory,
} from '@fairgarden/docs/abstractCreateDemo';
import { loadServerCodeMeta } from '@fairgarden/docs/pipeline/loadServerCodeMeta';
import { createLoadServerCodeSource } from '@fairgarden/docs/pipeline/loadServerCodeSource';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';

import { DemoContent } from '../DemoContent';

const sourceParser = createParseSource();

const loadSource = createLoadServerCodeSource();

/**
 * Creates a demo component for displaying code examples with syntax highlighting.
 * @param url Depends on `import.meta.url` to determine the source file location.
 * @param component The component to be rendered in the demo.
 * @param meta Additional meta for the demo.
 */
export const createDemo = createDemoFactory({
  DemoContent,
  loadCodeMeta: loadServerCodeMeta,
  loadSource,
  sourceParser,
  projectDir: process.env.SOURCE_CODE_ROOT_DIR,
  projectUrl: process.env.SOURCE_CODE_ROOT_URL,
});

/**
 * Creates a demo component for displaying code examples with syntax highlighting.
 * A variant is a different implementation style of the same component.
 * @param url Depends on `import.meta.url` to determine the source file location.
 * @param variants The variants of the component to be rendered in the demo.
 * @param meta Additional meta for the demo.
 */
export const createDemoWithVariants = createDemoWithVariantsFactory({
  DemoContent,
  loadCodeMeta: loadServerCodeMeta,
  loadSource,
  sourceParser,
  projectDir: process.env.SOURCE_CODE_ROOT_DIR,
  projectUrl: process.env.SOURCE_CODE_ROOT_URL,
});
