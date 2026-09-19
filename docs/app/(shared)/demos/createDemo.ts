import 'server-only';

import {
  createDemoFactory,
  createDemoWithVariantsFactory,
} from '@fairgarden/docs/abstractCreateDemo';

import { CollapsibleDemoContentLazy as DemoContent } from '../../lib/hooks/use-code-window/demos/CollapsibleDemoContentLazy';
import { DemoTitle } from '../../lib/components/code-highlighter/demos/DemoTitle';
import { DemoContentLoading } from './DemoContentLoading';

const projectDir = process.env.SOURCE_CODE_ROOT_DIR;
const projectUrl = process.env.SOURCE_CODE_ROOT_URL;

/**
 * Creates a demo whose initial HTML carries every one of its files as plain text,
 * not only the file behind the selected tab, so crawlers can read the whole demo.
 * @param url Depends on `import.meta.url` to determine the source file location.
 * @param component The component to be rendered in the demo.
 * @param meta Additional meta for the demo.
 */
export const createDemo = createDemoFactory({
  DemoContentLoading,
  DemoContent,
  DemoTitle,
  fallbackUsesExtraFiles: true,
  projectDir,
  projectUrl,
});

/**
 * Creates a demo with variants whose initial HTML carries every file of the selected variant.
 * A variant is a different implementation style of the same component.
 * @param url Depends on `import.meta.url` to determine the source file location.
 * @param variants The variants of the component to be rendered in the demo.
 * @param meta Additional meta for the demo.
 */
export const createDemoWithVariants = createDemoWithVariantsFactory({
  DemoContentLoading,
  DemoContent,
  DemoTitle,
  fallbackUsesExtraFiles: true,
  projectDir,
  projectUrl,
});
