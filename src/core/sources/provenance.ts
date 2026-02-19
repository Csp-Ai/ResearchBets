export interface SourceReference {
  provider: string;
  url: string;
  retrievedAt: string;
}

export interface DataProvenance {
  asOf: string;
  sources: SourceReference[];
}

export interface WithProvenance {
  provenance: DataProvenance;
  fallbackReason?: string;
}

export const buildProvenance = (sources: SourceReference[]): DataProvenance => ({
  asOf: new Date().toISOString(),
  sources,
});
