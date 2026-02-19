import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ResearchReport } from '../evidence/evidenceSchema';
import { getRequiredSupabaseServiceEnv } from '../supabase/env';

import type { ReportStore } from './reportStore';

const REPORTS_TABLE = 'research_reports';

const createSupabaseClient = (): SupabaseClient => {
  const { url, serviceRoleKey } = getRequiredSupabaseServiceEnv();
  return createClient(url, serviceRoleKey);
};

export class SupabaseReportStore implements ReportStore {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  async saveReport(report: ResearchReport): Promise<void> {
    const { error } = await this.client.from(REPORTS_TABLE).upsert({ report_id: report.reportId, report });

    if (error) {
      throw error;
    }
  }

  async getReport(reportId: string): Promise<ResearchReport | null> {
    const { data, error } = await this.client
      .from(REPORTS_TABLE)
      .select('report')
      .eq('report_id', reportId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.report as ResearchReport | undefined) ?? null;
  }
}
