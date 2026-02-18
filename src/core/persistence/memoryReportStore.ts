import type { ResearchReport } from '../evidence/evidenceSchema';

import type { ReportStore } from './reportStore';

export class MemoryReportStore implements ReportStore {
  private readonly reports = new Map<string, ResearchReport>();

  async saveReport(report: ResearchReport): Promise<void> {
    this.reports.set(report.reportId, report);
  }

  async getReport(reportId: string): Promise<ResearchReport | null> {
    return this.reports.get(reportId) ?? null;
  }
}
