import * as React from 'react';
import { wrapLandingActions } from './LandingActions';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';

/**
 * The closing call to action: a centered band whose line of links becomes a row of buttons.
 * @param tone background treatment of the band
 * @param children markdown content, ending with a paragraph of links
 */
export function LandingCta({
  tone = 'solid',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  return (
    <LandingSection tone={tone} centered>
      {wrapLandingActions(children)}
    </LandingSection>
  );
}
