export const REQUIRED_SCHEMA = {
  runtime_sessions: ['session_id', 'user_id', 'last_seen_at'],
  events_analytics: [
    'event_name',
    'created_at',
    'request_id',
    'trace_id',
    'run_id',
    'session_id',
    'user_id',
    'agent_id',
    'model_version',
    'confidence',
    'assumptions',
    'properties'
  ],
  bets: [
    'id',
    'user_id',
    'session_id',
    'snapshot_id',
    'trace_id',
    'run_id',
    'selection',
    'game_id',
    'market_type',
    'line',
    'book',
    'odds_format',
    'price',
    'odds',
    'recommended_id',
    'followed_ai',
    'placed_line',
    'placed_price',
    'placed_odds',
    'closing_line',
    'closing_price',
    'clv_line',
    'clv_price',
    'stake',
    'status',
    'outcome',
    'settled_profit',
    'confidence',
    'created_at',
    'settled_at',
    'resolution_reason',
    'source_url',
    'source_domain'
  ]
};

export function validateInspectionRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('inspect_public_columns RPC returned a non-array payload.');
  }

  for (const [index, row] of rows.entries()) {
    if (typeof row?.table_name !== 'string' || typeof row?.column_name !== 'string') {
      throw new TypeError(
        `inspect_public_columns RPC row at index ${index} is invalid (expected table_name and column_name strings).`
      );
    }
  }

  return rows;
}

export function buildObservedMap(rows) {
  const observed = new Map();
  for (const row of validateInspectionRows(rows ?? [])) {
    const table = row.table_name;
    const column = row.column_name;
    if (!observed.has(table)) observed.set(table, new Set());
    observed.get(table).add(column);
  }
  return observed;
}

export function findSchemaMismatches(required, observed) {
  const issues = [];

  for (const [table, requiredColumns] of Object.entries(required)) {
    const found = observed.get(table);
    if (!found) {
      issues.push({ table, type: 'missing_table' });
      continue;
    }

    const missingColumns = requiredColumns.filter((column) => !found.has(column));
    if (missingColumns.length > 0) {
      issues.push({ table, type: 'missing_columns', missingColumns });
    }
  }

  return issues;
}

export function getFixInstructions({ isLocalSupabase }) {
  if (isLocalSupabase) {
    return [
      'Local Supabase schema mismatch detected.',
      '  1) supabase db push',
      '  2) If mismatch persists, restart local services: supabase stop && supabase start',
      '  3) Re-run: npm run supabase:schema:check'
    ];
  }

  return [
    'Remote Supabase schema mismatch detected.',
    '  1) supabase db push',
    '  2) Wait 10–30s for PostgREST schema cache refresh',
    '  3) Refresh browser + re-run: npm run supabase:schema:check',
    'If errors persist, confirm SUPABASE_SERVICE_ROLE_KEY points to the same project as NEXT_PUBLIC_SUPABASE_URL.'
  ];
}
