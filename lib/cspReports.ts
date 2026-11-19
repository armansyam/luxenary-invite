export interface CspViolationRecord {
  at: string;
  directive: string;
  blocked: string;
  document: string;
}

const MAX_RECENT_CSP_REPORTS = 100;

declare global {
  var luxCspReports: CspViolationRecord[] | undefined;
  var luxCspTotalCount: number | undefined;
}

const reports: CspViolationRecord[] = global.luxCspReports ?? [];
if (!global.luxCspReports) global.luxCspReports = reports;

export function recordCspViolation(entry: Omit<CspViolationRecord, "at">): void {
  global.luxCspTotalCount = (global.luxCspTotalCount ?? 0) + 1;
  reports.unshift({
    at: new Date().toISOString(),
    directive: entry.directive || "unknown",
    blocked: entry.blocked || "inline",
    document: entry.document || "/",
  });
  if (reports.length > MAX_RECENT_CSP_REPORTS) {
    reports.length = MAX_RECENT_CSP_REPORTS;
  }
}

export function getCspViolationSummary() {
  const byDirective = new Map<string, number>();
  for (const r of reports) {
    const key = r.directive || "unknown";
    byDirective.set(key, (byDirective.get(key) || 0) + 1);
  }
  return {
    totalSinceBoot: global.luxCspTotalCount ?? reports.length,
    recentCount: reports.length,
    byDirective: Array.from(byDirective.entries())
      .map(([directive, count]) => ({ directive, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recent: reports.slice(0, 20),
  };
}
