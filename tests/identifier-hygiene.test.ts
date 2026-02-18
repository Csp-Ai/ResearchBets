import { describe, expect, it } from 'vitest';

import { createClientRequestId, hasPlaceholderIdentifier } from '../src/core/identifiers/session';

describe('identifier hygiene', () => {
  it('generates request ids without placeholders', () => {
    const requestId = createClientRequestId();
    expect(requestId.length).toBeGreaterThan(10);
    expect(hasPlaceholderIdentifier(requestId)).toBe(false);
  });

  it('flags known placeholders', () => {
    expect(hasPlaceholderIdentifier('trace-ui')).toBe(true);
    expect(hasPlaceholderIdentifier('unknown-user')).toBe(true);
  });
});
