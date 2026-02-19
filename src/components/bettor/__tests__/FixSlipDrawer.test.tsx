import { describe, expect, it } from 'vitest';

import { removeWeakestLeg, toTwoLegSlip } from '../FixSlipDrawer';

describe('FixSlipDrawer helpers', () => {
  const legs = [
    { id: '1', selection: 'A' },
    { id: '2', selection: 'B' },
    { id: '3', selection: 'C' },
  ];

  it('removes weakest leg from end', () => {
    expect(removeWeakestLeg(legs)).toEqual([
      { id: '1', selection: 'A' },
      { id: '2', selection: 'B' },
    ]);
  });

  it('converts to two-leg slip', () => {
    expect(toTwoLegSlip(legs)).toHaveLength(2);
  });
});
