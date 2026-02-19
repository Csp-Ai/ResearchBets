declare module '*supabase-schema-check-helper.mjs' {
  export const REQUIRED_SCHEMA: readonly { table: string; columns: readonly string[] }[];
  export function validateInspectionRows(rows: unknown): { table_name: string; column_name: string }[];
  export function buildObservedMap(rows: { table_name: string; column_name: string }[]): Map<string, Set<string>>;
  export function findSchemaMismatches(requiredSchema: readonly { table: string; columns: readonly string[] }[], observed: Map<string, Set<string>>): unknown[];
}
