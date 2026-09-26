/**
 * @vitest-environment jsdom
 *
 * A file whose source reaches the client as a plain string (never parsed on the
 * server) is parsed and highlighted by `CodeHighlighterClient` once it hydrates.
 * Under `CodeProviderLazy` grammars load on demand, so the parse waits until the
 * grammars for the block's files can actually be used.
 */
import * as React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CodeHighlighterClient } from './CodeHighlighterClient';
import { CodeContext } from '../CodeProvider/CodeContext';
import { useCode } from '../useCode';
import { createParseSource, resetStarryNight } from '../pipeline/parseSource/parseSource';
import { ensureGrammars } from '../pipeline/parseSource/grammarCache';
import { parseCode } from '../pipeline/loadIsomorphicCodeVariant/parseCode';
import type { Code, ContentProps, HastRoot, ParseSource } from './types';

// Where `parseSource` keeps the shared Starry Night instance.
const STARRY_NIGHT_KEY = '__docs_infra_starry_night_instance__';

beforeAll(() => {
  // `<Pre>` observes frame visibility; jsdom has neither observer.
  class NoopObserver {
    observe() {}

    unobserve() {}

    disconnect() {}

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  resetStarryNight();
});

/** Renders every file of the selected variant, each under its name. */
function FilesContent(props: ContentProps<object>) {
  const code = useCode(props);
  return (
    <div>
      {code.files.map((file) => (
        <section key={file.name} data-testid={file.name}>
          {file.component}
        </section>
      ))}
    </div>
  );
}

/** The main file as the server parsed it: one highlighted line. */
const parsedMainFile: HastRoot = {
  type: 'root',
  data: { totalLines: 1, focusedLines: 1 },
  children: [
    {
      type: 'element',
      tagName: 'span',
      properties: { className: 'frame' },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: { className: 'line', dataLn: 1 },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['pl-k'] },
              children: [{ type: 'text', value: 'export' }],
            },
            { type: 'text', value: ' const Button = () => null;' },
          ],
        },
      ],
    },
  ],
};

/** The main file parsed, its extra files still plain strings. */
const code: Code = {
  Default: {
    fileName: 'Button.tsx',
    source: parsedMainFile,
    extraFiles: {
      'button.css': { source: '.button {\n  color: red;\n}' },
      'useToggle.ts': { source: 'export const useToggle = (value: boolean) => !value;' },
    },
  },
};

function renderBlock(parseSource: ParseSource) {
  return render(
    <CodeContext.Provider
      value={{ parseSource, sourceParser: Promise.resolve(parseSource), parseCode }}
    >
      <CodeHighlighterClient variants={['Default']} code={code} highlightAfter="init">
        <FilesContent />
      </CodeHighlighterClient>
    </CodeContext.Provider>,
  );
}

const isHighlighted = (fileName: string) =>
  screen.getByTestId(fileName).querySelector('[class*="pl-"]') !== null;

describe('CodeHighlighterClient string files', () => {
  it('highlights extra files that are still strings after hydration', async () => {
    renderBlock(await createParseSource());

    await waitFor(() => {
      expect(isHighlighted('button.css')).toBe(true);
      expect(isHighlighted('useToggle.ts')).toBe(true);
    });
    expect(isHighlighted('Button.tsx')).toBe(true);
  });

  it('highlights them when their grammars are still being registered as the block mounts', async () => {
    // Grammars load on demand, as under `CodeProviderLazy`.
    const parseSource = await createParseSource([]);

    // Another block on the page is registering the same grammars when this one
    // mounts: the engine already lists them, but can't highlight with them yet.
    const engine = (globalThis as Record<string, unknown>)[STARRY_NIGHT_KEY] as {
      register: (grammars: unknown[]) => Promise<void>;
    };
    const register = engine.register;
    let mounted = false;
    engine.register = async (grammars) => {
      const registering = register(grammars);
      if (!mounted) {
        mounted = true;
        renderBlock(parseSource);
      }
      await registering;
    };

    await ensureGrammars(['source.tsx', 'source.css', 'source.ts']);

    expect(mounted).toBe(true);
    await waitFor(() => {
      expect(isHighlighted('button.css')).toBe(true);
      expect(isHighlighted('useToggle.ts')).toBe(true);
    });
  });
});
