/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PreSubmitPatternWarningCard } from '@/src/components/slips/PreSubmitPatternWarning';

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

  it('does not render when warning is suppressed', () => {
    const { container } = render(
      <PreSubmitPatternWarningCard
        warning={{
          warning_level: 'none',
          matched_patterns: [],
          recommendation_summary: 'No recurring reviewed pattern is close enough to this slip to show a warning.',
          sample_size: 1,
          confidence_level: 'low',
          suppression_reason: 'insufficient_history'
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
