export type GovernorCheck = {
  id: string;
  level: 'error' | 'warn' | 'info';
  pass: boolean;
  message: string;
};

export type GovernorReport = {
  ok: boolean;
  trace_id: string;
  checks: GovernorCheck[];
};
