import { getCurrentAccessContext } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewReportDates, resolveViewReportWindow } from "@/features/analytics/services/view-report-period";

export const dynamic = "force-dynamic";

const propertyTypeLabels: Record<string, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  country_house: "Casa de campo",
};

function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number>): string {
  return values.map(csvCell).join(",");
}

function errorResponse(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  try {
    const access = await getCurrentAccessContext();
    if (!access) return errorResponse(401);
    if (access.role !== "admin" || access.status !== "active") return errorResponse(403);

    const supabase = await createSupabaseServerClient();
    const viewDays = resolveViewReportWindow(new URL(request.url).searchParams.get("views"));
    const days = getViewReportDates(viewDays);
    const rangeStart = days[0];
    const rangeEnd = days.at(-1) ?? rangeStart;
    const [dailyResult, topResult, breakdownResult] = await Promise.all([
      supabase.rpc("admin_property_view_daily_counts", {
        range_start: rangeStart,
        range_end: rangeEnd,
      }),
      supabase.rpc("admin_property_view_top_properties", {
        range_start: rangeStart,
        range_end: rangeEnd,
        result_limit: 10,
      }),
      supabase.rpc("admin_property_view_breakdowns", {
        range_start: rangeStart,
        range_end: rangeEnd,
      }),
    ]);

    if (dailyResult.error || topResult.error || breakdownResult.error) {
      return errorResponse(503);
    }

    const dailyCounts = new Map<string, number>(
      ((dailyResult.data ?? []) as Array<{ view_date: string; view_count: number | string }>).map((row) => [
        row.view_date,
        Number(row.view_count),
      ]),
    );
    const lines = [csvRow(["tipo", "fecha_utc", "elemento", "slug", "vistas"])];
    for (const day of days) {
      lines.push(csvRow(["total_diario", day, "", "", dailyCounts.get(day) ?? 0]));
    }

    const topProperties = (topResult.data ?? []) as Array<{
      property_title: string;
      property_slug: string;
      view_count: number | string;
    }>;
    for (const property of topProperties) {
      lines.push(csvRow(["ficha_mas_vista", "", property.property_title, property.property_slug, Number(property.view_count)]));
    }

    const breakdownRows = (breakdownResult.data ?? []) as Array<{
      dimension: "tipo" | "ciudad";
      label: string;
      view_count: number | string;
    }>;
    for (const row of breakdownRows) {
      const dimension = row.dimension === "tipo" ? "vistas_por_tipo" : "vistas_por_ciudad";
      const label = row.dimension === "tipo" ? (propertyTypeLabels[row.label] ?? row.label) : row.label;
      lines.push(csvRow([dimension, "", label, "", Number(row.view_count)]));
    }

    const filename = `paradise-vistas-${viewDays}d-${rangeStart}-${rangeEnd}.csv`;
    const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse(503);
  }
}
