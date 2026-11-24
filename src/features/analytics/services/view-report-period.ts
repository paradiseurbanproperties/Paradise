export const viewReportWindows = [7, 28, 90] as const;

export type ViewReportWindow = (typeof viewReportWindows)[number];

export function resolveViewReportWindow(value: unknown): ViewReportWindow {
  if (typeof value !== "string") return 28;
  return viewReportWindows.find((days) => String(days) === value) ?? 28;
}

export function getViewReportDates(days: ViewReportWindow, now = new Date()): string[] {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) =>
    new Date(today.getTime() - (days - index - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
}
