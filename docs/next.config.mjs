import createMDX from '@next/mdx';
import {
  withFairGardenDocs,
  getFairGardenDocsMdxOptions,
  withDeploymentConfig,
} from '@fairgarden/docs/withFairGardenDocs';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Create MDX with FairGarden Docs configuration
const withMDX = createMDX({
  options: getFairGardenDocsMdxOptions({
    additionalRemarkPlugins: [],
    additionalRehypePlugins: ['rehype-slug'],
    extractToIndex: {
      indexWrapperComponent: 'PagesIndex',
      include: [
        'app/lib/overview',
        'app/lib/components',
        'app/lib/hooks',
        'app/lib/commands',
        'app/lib/factories',
        'app/lib/patterns',
        'app/lib/pipeline',
        'app/lib/conventions',
      ],
    },
  }),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your custom configuration here
  // The withFairGardenDocs plugin will add the necessary docs infrastructure setup
  distDir: 'export',
  trailingSlash: false,
  devIndicators: {
    position: 'bottom-right',
  },
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
};

export default withDeploymentConfig(
  withBundleAnalyzer(
    withFairGardenDocs({
      // Add demo-* patterns specific to this docs site
      additionalDemoPatterns: {
        // Note: The demo-* pattern below is specific to our internal docs structure
        // where we create "demos of demos". This is not a typical use case.
        index: ['./app/**/demos/*/demo-*/index.ts'],
        client: ['./app/**/demos/*/demo-*/client.ts'],
      },
      demoEmphasisOptions: { paddingFrameMaxSize: 2, focusFramesMaxSize: 18 },
      transformTypescriptToJavascript: true,
      requireDemoPage: true,
    })(withMDX(nextConfig)),
  ),
);
