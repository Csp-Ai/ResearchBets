/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { PostmortemUploadWedge } from '@/src/components/landing/PostmortemUploadWedge';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

describe('PostmortemUploadWedge', () => {
  it('parses pasted slip and stores parsed payload for stress-test preload', () => {
    renderWithNervousSystem(<PostmortemUploadWedge />);
    fireEvent.change(screen.getByLabelText('Paste slip text'), { target: { value: 'FanDuel SGP\nLeBron James - Over 28.5 Points -110' } });
    expect(screen.getByText('Detected: FanDuel')).toBeTruthy();
    const run = screen.getByText('Run post-mortem →');
    fireEvent.click(run);
    const href = (run as HTMLAnchorElement).getAttribute('href') ?? '';
    const key = new URL(`http://localhost${href}`).searchParams.get('prefill_key');
    expect(key).toBeTruthy();
    expect(window.sessionStorage.getItem(key!)).toContain('FanDuel');
  });
});
