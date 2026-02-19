import { describe, expect, it } from 'vitest';

import {
  buildObservedMap,
  findSchemaMismatches,
  REQUIRED_SCHEMA
} from '../../../../scripts/lib/supabase-schema-check-helper.mjs';

describe('supabase schema check helper', () => {
  it('detects missing tables and columns', () => {
    const observed = buildObservedMap([
      { table_name: 'runtime_sessions', column_name: 'session_id' },
      { table_name: 'runtime_sessions', column_name: 'user_id' },
      { table_name: 'events_analytics', column_name: 'event_name' }
    ]);

    const issues = findSchemaMismatches(REQUIRED_SCHEMA, observed);

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          table: 'runtime_sessions',
          type: 'missing_columns',
          missingColumns: ['last_seen_at']
        },
        {
          table: 'events_analytics',
          type: 'missing_columns',
          missingColumns: expect.arrayContaining(['created_at', 'agent_id'])
        },
        {
          table: 'bets',
          type: 'missing_table'
        }
      ])
    );
  });
});
