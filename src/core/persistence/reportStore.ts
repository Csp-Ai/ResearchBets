import type { ResearchReport } from '../evidence/evidenceSchema';

export interface ReportStore {
  saveReport(report: ResearchReport): Promise<void>;
  getReport(reportId: string): Promise<ResearchReport | null>;
}
