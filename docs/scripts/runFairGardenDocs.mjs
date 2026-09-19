// Thin wrapper that runs the `@fairgarden/docs` CLI from the workspace
// package's build output. Importing the package by name (rather than relying on
// its `docs` bin) avoids depending on pnpm linking the bin shim, which it
// skips on a warm reinstall when the dependency graph is unchanged. The CLI
// parses `process.argv` itself on import.
//
// Run with plain `node` (not `tsx`): tsx resolves the package to its TypeScript
// source, but the CLI must run from build output (it spawns a built
// `validateWorker.mjs` sibling that only exists in the build directory).
import '@fairgarden/docs/cli';
