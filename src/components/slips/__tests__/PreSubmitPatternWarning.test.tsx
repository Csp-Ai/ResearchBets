/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  PreSubmitPatternWarningCard,
  PreSubmitSuggestedFixesCard
} from '@/src/components/slips/PreSubmitPatternWarning';

describe('PreSubmitPatternWarningCard', () => {
  it('renders compact warning copy when supported by matched history', () => {
    render(
      <PreSubmitPatternWarningCard
        warning={{
          warning_level: 'medium',
          matched_patterns: [
            {
              tag: 'line_too_aggressive',
              reason:
                'Reviewed losses repeatedly tagged aggressive lines, and this slip carries 3 high-threshold ladder legs.'
            }
          ],
          recommendation_summary:
            'Your reviewed history shows repeated misses on aggressive ladders. This slip contains 3 similar threshold legs.',
          suggested_fixes: [
            {
              fix_type: 'lower_threshold',
              title: 'Lower one ladder threshold',
              explanation: 'Bring one ladder back into a more normal range.',
              affected_legs: ['leg-1'],
              suggested_action: 'Step down one of the longest ladder legs first.',
              confidence_level: 'medium'
            }
          ],
          sample_size: 4,
          confidence_level: 'medium'
        }}
      />
    );

    expect(screen.getByTestId('pre-submit-pattern-warning')).toBeTruthy();
    expect(screen.getByText(/pre-submit pattern check/i)).toBeTruthy();
    expect(screen.getByText(/3 similar threshold legs/i)).toBeTruthy();
    expect(screen.getByText(/advisory only/i)).toBeTruthy();
  });

  it('renders a compact suggested fixes module when fixes are supported', () => {
    render(
      <PreSubmitSuggestedFixesCard
        warning={{
          warning_level: 'medium',
          matched_patterns: [
            {
              tag: 'correlated_legs',
              reason: 'Reviewed losses repeatedly tagged correlated legs.'
            }
          ],
          recommendation_summary: 'Your reviewed history shows repeated misses from correlated stacks.',
          suggested_fixes: [
            {
              fix_type: 'reduce_correlation',
              title: 'Break one same-script dependency',
              explanation: 'Reducing one shared script dependency is the highest-signal fix.',
              affected_legs: ['leg-1', 'leg-2'],
              suggested_action: 'Replace one dependent leg with something from a different game.',
              confidence_level: 'high'
            },
            {
              fix_type: 'swap_stat_type',
              title: 'Swap one dependent stat type',
              explanation: 'A role stat can keep the same player read while reducing scoring dependence.',
              affected_legs: ['leg-2'],
              suggested_action: 'Consider a more independent role stat if your board already offers one.',
              confidence_level: 'medium'
            }
          ],
          sample_size: 6,
          confidence_level: 'high'
        }}
      />
    );

    expect(screen.getByTestId('pre-submit-suggested-fixes')).toBeTruthy();
    expect(screen.getByText(/suggested fixes/i)).toBeTruthy();
    expect(screen.getByText(/break one same-script dependency/i)).toBeTruthy();
    expect(screen.getByText(/compact, advisory-only ways to lower risk/i)).toBeTruthy();
  });

  it('does not render the warning or fixes module when warning is suppressed or no fix is supported', () => {
    const { container } = render(
      <>
        <PreSubmitPatternWarningCard
          warning={{
            warning_level: 'none',
            matched_patterns: [],
            recommendation_summary: 'No recurring reviewed pattern is close enough to this slip to show a warning.',
            suggested_fixes: [],
            sample_size: 1,
            confidence_level: 'low',
            suppression_reason: 'insufficient_history'
          }}
        />
        <PreSubmitSuggestedFixesCard
          warning={{
            warning_level: 'medium',
            matched_patterns: [
              {
                tag: 'correlated_legs',
                reason: 'Reviewed losses repeatedly tagged correlated legs.'
              }
            ],
            recommendation_summary: 'Correlated stacks are showing up again.',
            suggested_fixes: [],
            sample_size: 4,
            confidence_level: 'medium'
          }}
        />
      </>
    );

    expect(container.firstChild).toBeNull();
  });
});
