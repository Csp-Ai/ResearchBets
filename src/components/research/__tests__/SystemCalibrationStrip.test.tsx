/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SystemCalibrationStrip } from '@/src/components/research/SystemCalibrationStrip';

describe('SystemCalibrationStrip', () => {
  afterEach(() => {
    cleanup();
  });
  it('hides 0% accuracy when runs analyzed is 0 and shows neutral learning copy', () => {
    render(
      <SystemCalibrationStrip
        takeAccuracy={0}
        weakestLegAccuracy={0}
        runsAnalyzed={0}
        lastUpdated={null}
      />
    );

    expect(screen.getAllByText('Learning starts after your first settled slip.').length).toBeGreaterThan(0);
    expect(screen.queryByText(/0%/)).toBeNull();
    expect(screen.getByText(/Runs analyzed:/)).toBeTruthy();
    expect(screen.getByLabelText('What is this?')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull();
    expect(screen.getByText('Just now')).toBeTruthy();
  });

  it('keeps accuracy hidden until calibration floor is reached', () => {
    render(
      <SystemCalibrationStrip
        takeAccuracy={0.88}
        weakestLegAccuracy={0.77}
        runsAnalyzed={9}
        lastUpdated={null}
      />
    );

    expect(screen.getAllByText('Learning starts after your first settled slip.').length).toBeGreaterThan(0);
    expect(screen.queryByText(/TAKE accuracy/i)).toBeNull();
    expect(screen.queryByText(/Weakest leg accuracy/i)).toBeNull();
  });
});
