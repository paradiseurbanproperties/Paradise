import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewReportDates, type ViewReportWindow } from "@/features/analytics/services/view-report-period";

export type DashboardMetric = number | null;

export type DashboardBreakdown = {
  label: string;
  value: DashboardMetric;
};

export type PropertyCreationPoint = {
  label: string;
  period: string;
  value: DashboardMetric;
};

export type PaymentSimulationWeek = {
  label: string;
  start: string;
  succeeded: DashboardMetric;
  declined: DashboardMetric;
};

export type PropertyViewPoint = {
  label: string;
  period: string;
  value: DashboardMetric;
};

export type TopPropertyView = {
  id: string;
  title: string;
  slug: string;
  views: number;
};

export type RecentPriceChange = {
  id: string;
  propertyTitle: string;
  propertySlug: string;
  previousPrice: number;
  newPrice: number;
  currency: string;
  changedAt: string;
};

export type AdminDashboardMetrics = {
  propertiesTotal: DashboardMetric;
  propertiesPublished: DashboardMetric;
  propertiesPending: DashboardMetric;
  activeClients: DashboardMetric;
  activePlans: DashboardMetric;
  activePremiumPeriods: DashboardMetric;
  successfulSimulations28d: DashboardMetric;
  declinedSimulations28d: DashboardMetric;
  publicationStatuses: DashboardBreakdown[];
  commercialStatuses: DashboardBreakdown[];
  propertyCreationTrend: PropertyCreationPoint[];
  paymentSimulationTrend: PaymentSimulationWeek[];
  propertyViewTrend: PropertyViewPoint[];
  propertyViewTypeBreakdown: DashboardBreakdown[];
  propertyViewCityBreakdown: DashboardBreakdown[];
  topPropertyViews: TopPropertyView[];
  recentPriceChanges: RecentPriceChange[];
  unavailableSources: string[];
};

const publicationStatuses = [
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobada" },
  { value: "rejected", label: "Rechazada" },
  { value: "archived", label: "Archivada" },
] as const;

const commercialStatuses = [
  { value: "available", label: "Disponible" },
  { value: "in_deal", label: "En negociación" },
  { value: "sold", label: "Vendida" },
] as const;

const propertyTypeLabels = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  country_house: "Casa de campo",
} as const;

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", { month: "short" }).format(date).replace(".", "");
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}

export async function getAdminDashboardMetrics({ viewDays = 28 }: { viewDays?: ViewReportWindow } = {}): Promise<AdminDashboardMetrics> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const unavailableSources: string[] = [];

  const publicationQueries = publicationStatuses.map(({ value }) =>
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("publication_status", value),
  );
  const commercialQueries = commercialStatuses.map(({ value }) =>
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", value),
  );

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { date, start: monthStart(date), end: monthEnd(date) };
  });
  const propertyTrendQueries = months.map(({ start, end }) =>
    supabase.from("properties")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
  );

  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(fourWeeksAgo.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  });
  const paymentTrendQueries = weeks.flatMap(({ start, end }) => [
    supabase.from("payment_simulations")
      .select("id", { count: "exact", head: true })
      .eq("result", "succeeded")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    supabase.from("payment_simulations")
      .select("id", { count: "exact", head: true })
      .eq("result", "declined")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
  ]);

  const viewPeriods = getViewReportDates(viewDays, now);
  const viewStartDate = viewPeriods[0];
  const viewEndDate = viewPeriods.at(-1) ?? viewStartDate;
  const propertyViewsQuery = supabase.rpc("admin_property_view_daily_counts", {
    range_start: viewStartDate,
    range_end: viewEndDate,
  });
  const topPropertyViewsQuery = supabase.rpc("admin_property_view_top_properties", {
    range_start: viewStartDate,
    range_end: viewEndDate,
    result_limit: 10,
  });
  const propertyViewBreakdownsQuery = supabase.rpc("admin_property_view_breakdowns", {
    range_start: viewStartDate,
    range_end: viewEndDate,
  });

  const [
    publicationResults,
    commercialResults,
    propertyTrendResults,
    paymentTrendResults,
    propertyViewsResult,
    topPropertyViewsResult,
    propertyViewBreakdownsResult,
    [clientsResult, activePlansResult, activePremiumResult, priceChangesResult],
  ] = await Promise.all([
    Promise.all(publicationQueries),
    Promise.all(commercialQueries),
    Promise.all(propertyTrendQueries),
    Promise.all(paymentTrendQueries),
    propertyViewsQuery,
    topPropertyViewsQuery,
    propertyViewBreakdownsQuery,
    Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .eq("base_role", "client").eq("account_status", "active"),
    supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("subscriptions").select("id", { count: "exact", head: true })
      .eq("status", "active").lte("starts_at", nowIso).gt("expires_at", nowIso),
    supabase.from("property_price_history")
      .select("id, previous_price, new_price, currency, changed_at, properties(title, slug)")
      .order("changed_at", { ascending: false })
      .limit(6),
    ]),
  ]);

  const countValue = (result: { count: number | null; error: { code: string } | null }, label: string): DashboardMetric => {
    if (result.error) {
      unavailableSources.push(label);
      return null;
    }
    return result.count ?? 0;
  };
  const publicationBreakdown = publicationResults.map((result, index) => ({
    label: publicationStatuses[index].label,
    value: countValue(result, `Publicación ${publicationStatuses[index].label.toLowerCase()}`),
  }));
  const commercialBreakdown = commercialResults.map((result, index) => ({
    label: commercialStatuses[index].label,
    value: countValue(result, `Estado ${commercialStatuses[index].label.toLowerCase()}`),
  }));
  const propertyCreationTrend = propertyTrendResults.map((result, index) => ({
    label: monthLabel(months[index].date),
    period: months[index].date.toISOString().slice(0, 7),
    value: countValue(result, `Propiedades ${monthLabel(months[index].date)}`),
  }));
  const paymentSimulationTrend = weeks.map((week, index) => ({
    label: `${dayLabel(week.start)}–${dayLabel(new Date(week.end.getTime() - 1))}`,
    start: week.start.toISOString(),
    succeeded: countValue(paymentTrendResults[index * 2], `Simulaciones aprobadas semana ${index + 1}`),
    declined: countValue(paymentTrendResults[index * 2 + 1], `Simulaciones rechazadas semana ${index + 1}`),
  }));
  if (propertyViewsResult.error) unavailableSources.push("Vistas de fichas");
  if (topPropertyViewsResult.error) unavailableSources.push("Ranking de fichas vistas");
  if (propertyViewBreakdownsResult.error) unavailableSources.push("Desglose de vistas");
  const viewCounts = new Map<string, number>(
    ((propertyViewsResult.data ?? []) as Array<{ view_date: string; view_count: number | string }>).map((row) => [
      row.view_date,
      Number(row.view_count),
    ]),
  );
  const propertyViewTrend: PropertyViewPoint[] = viewPeriods.map((period) => {
    return {
      label: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${period}T00:00:00.000Z`)).replace(".", ""),
      period,
      value: propertyViewsResult.error ? null : (viewCounts.get(period) ?? 0),
    };
  });
  const topPropertyViews: TopPropertyView[] = ((topPropertyViewsResult.data ?? []) as Array<{
    property_id: string;
    property_title: string;
    property_slug: string;
    view_count: number | string;
  }>).map((row) => ({
    id: row.property_id,
    title: row.property_title,
    slug: row.property_slug,
    views: Number(row.view_count),
  }));
  const propertyViewBreakdownRows = (propertyViewBreakdownsResult.data ?? []) as Array<{
    dimension: "tipo" | "ciudad";
    label: string;
    view_count: number | string;
  }>;
  const propertyViewTypeCounts = new Map<string, number>(
    propertyViewBreakdownRows.filter((row) => row.dimension === "tipo").map((row) => [row.label, Number(row.view_count)]),
  );
  const propertyViewCityBreakdown = propertyViewBreakdownRows
    .filter((row) => row.dimension === "ciudad")
    .map((row) => ({ label: row.label, value: Number(row.view_count) }));
  const propertyViewTypeBreakdown = Object.entries(propertyTypeLabels).map(([type, label]) => ({
    label,
    value: propertyViewBreakdownsResult.error ? null : (propertyViewTypeCounts.get(type) ?? 0),
  }));

  const propertiesTotal = commercialBreakdown.some((item) => item.value === null)
    ? null
    : commercialBreakdown.reduce((total, item) => total + (item.value ?? 0), 0);
  const propertiesPublished = publicationBreakdown.find((item) => item.label === "Aprobada")?.value ?? null;
  const propertiesPending = publicationBreakdown.find((item) => item.label === "Pendiente")?.value ?? null;
  const successfulSimulations28d = paymentSimulationTrend.some((week) => week.succeeded === null)
    ? null
    : paymentSimulationTrend.reduce((total, week) => total + (week.succeeded ?? 0), 0);
  const declinedSimulations28d = paymentSimulationTrend.some((week) => week.declined === null)
    ? null
    : paymentSimulationTrend.reduce((total, week) => total + (week.declined ?? 0), 0);

  const activeClients = countValue(clientsResult, "Clientes activos");
  const activePlans = countValue(activePlansResult, "Planes Premium activos");
  const activePremiumPeriods = countValue(activePremiumResult, "Vigencias Premium");

  if (priceChangesResult.error) unavailableSources.push("Cambios de precio recientes");
  const recentPriceChanges = (priceChangesResult.data ?? []).map((change) => {
    const property = Array.isArray(change.properties) ? change.properties[0] : change.properties;
    return {
      id: change.id,
      propertyTitle: property?.title ?? "Propiedad",
      propertySlug: property?.slug ?? "",
      previousPrice: Number(change.previous_price),
      newPrice: Number(change.new_price),
      currency: change.currency,
      changedAt: change.changed_at,
    };
  });

  return {
    propertiesTotal,
    propertiesPublished,
    propertiesPending,
    activeClients,
    activePlans,
    activePremiumPeriods,
    successfulSimulations28d,
    declinedSimulations28d,
    publicationStatuses: publicationBreakdown,
    commercialStatuses: commercialBreakdown,
    propertyCreationTrend,
    paymentSimulationTrend,
    propertyViewTrend,
    propertyViewTypeBreakdown,
    propertyViewCityBreakdown,
    topPropertyViews,
    recentPriceChanges,
    unavailableSources: [...new Set(unavailableSources)],
  };
}
