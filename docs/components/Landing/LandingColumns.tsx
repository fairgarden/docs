import * as React from 'react';
import { Pre } from '@/components/Pre';
import { CollapsibleCodeContentLazy } from '@/app/lib/hooks/use-code-window/demos/CollapsibleCodeContentLazy';
import { CollapsibleCodeContentLoading } from '@/app/lib/hooks/use-code-window/demos/CollapsibleCodeContentLoading';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';

/**
 * A band that places its adjacent code blocks side by side, stacking them on narrow screens.
 * Works best with a pair of fenced code blocks.
 * @param tone background treatment of the band
 * @param collapsible folds each code block down to its `@focus` region until it is expanded;
 * add `initialExpanded` to a fence to start it open
 * @param children markdown content holding the code blocks
 */
export function LandingColumns({
  tone = 'plain',
  collapsible = false,
  children,
}: {
  tone?: LandingTone;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const blocks = collapsible
    ? React.Children.map(children, (child) =>
        React.isValidElement<React.ComponentProps<typeof Pre>>(child) && child.type === Pre
          ? React.cloneElement(child, {
              Content: CollapsibleCodeContentLazy,
              ContentLoading: CollapsibleCodeContentLoading,
            })
          : child,
      )
    : children;

  return (
    <LandingSection tone={tone} columns>
      {blocks}
    </LandingSection>
  );
}
