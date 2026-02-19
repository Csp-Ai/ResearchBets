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

export function buildObservedMap(rows) {
  const observed = new Map();
  for (const row of rows ?? []) {
    const table = String(row.table_name);
    const column = String(row.column_name);
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

export function getFixInstructions() {
  return [
    'Run Supabase migrations and refresh local cache:',
    '  1) supabase db push',
    '  2) supabase db reset --linked (optional for local clean slate)',
    '  3) npm run supabase:schema:check',
    'If errors persist, confirm SUPABASE_SERVICE_ROLE_KEY points to the same project as NEXT_PUBLIC_SUPABASE_URL.'
  ];
}
