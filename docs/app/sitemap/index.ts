import { createSitemap } from '@fairgarden/docs/createSitemap';
import LibOverview from '../lib/overview/page.mdx';
import LibComponents from '../lib/components/page.mdx';
import LibHooks from '../lib/hooks/page.mdx';
import LibCommands from '../lib/commands/page.mdx';
import LibFactories from '../lib/factories/page.mdx';
import LibPatterns from '../lib/patterns/page.mdx';
import LibPipeline from '../lib/pipeline/page.mdx';
import LibConventions from '../lib/conventions/page.mdx';

export const sitemap = createSitemap(import.meta.url, {
  LibOverview,
  LibComponents,
  LibHooks,
  LibCommands,
  LibFactories,
  LibPatterns,
  LibPipeline,
  LibConventions,
});
