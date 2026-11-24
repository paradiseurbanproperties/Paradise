import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: "MXN";
  durationDays: number;
  benefits: string[];
};

export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled";

export type CurrentSubscription = {
  id: string;
  status: SubscriptionStatus;
  startsAt: string | null;
  expiresAt: string | null;
  planName: string;
};

export type AdminSubscriptionPlan = SubscriptionPlan & {
  isActive: boolean;
};

export type PaymentSimulationRecord = {
  id: string;
  result: "succeeded" | "declined";
  amount: number;
  currency: "MXN";
  reference: string;
  createdAt: string;
};

export type SubscriptionHistoryItem = CurrentSubscription & {
  createdAt: string;
  simulation: PaymentSimulationRecord | null;
};

export type AdminSubscriptionRow = SubscriptionHistoryItem & {
  userId: string;
  displayName: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];
}

function joinedName(value: unknown, fallback: string): string {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "name" in first && typeof first.name === "string") {
      return first.name;
    }
  }
  if (value && typeof value === "object" && "name" in value && typeof (value as { name: unknown }).name === "string") {
    return (value as { name: string }).name;
  }
  return fallback;
}

function joinedDisplayName(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "display_name" in first && typeof first.display_name === "string") {
      return first.display_name;
    }
  }
  if (value && typeof value === "object" && "display_name" in value && typeof (value as { display_name: unknown }).display_name === "string") {
    return (value as { display_name: string }).display_name;
  }
  return "Cuenta sin nombre";
}

function latestSimulation(value: unknown): PaymentSimulationRecord | null {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  const simulations = rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const simulation = row as {
        id?: unknown;
        result?: unknown;
        amount?: unknown;
        currency?: unknown;
        simulation_reference?: unknown;
        created_at?: unknown;
      };
      if (typeof simulation.id !== "string" || (simulation.result !== "succeeded" && simulation.result !== "declined")) {
        return null;
      }
      if (typeof simulation.created_at !== "string" || typeof simulation.simulation_reference !== "string") {
        return null;
      }
      return {
        id: simulation.id,
        result: simulation.result,
        amount: Number(simulation.amount ?? 0),
        currency: "MXN" as const,
        reference: simulation.simulation_reference,
        createdAt: simulation.created_at,
      };
    })
    .filter((item): item is PaymentSimulationRecord => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return simulations[0] ?? null;
}

function parseSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (value === "pending" || value === "active" || value === "expired" || value === "cancelled") return value;
  return "pending";
}

export function visibleSubscriptionStatus(
  status: unknown,
  expiresAt: string | null,
  now = new Date(),
): SubscriptionStatus {
  const parsed = parseSubscriptionStatus(status);
  if (parsed === "active" && expiresAt && new Date(expiresAt) <= now) return "expired";
  return parsed;
}

export const listActiveSubscriptionPlans = cache(async (): Promise<{
  plans: SubscriptionPlan[];
  status: "ready" | "not_configured" | "unavailable";
}> => {
  if (!getSupabasePublicConfig()) return { plans: [], status: "not_configured" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, slug, name, description, price, currency, duration_days, benefits")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(12);

  if (error) {
    console.error("[subscriptions] No se pudieron consultar los planes", { code: error.code });
    return { plans: [], status: "unavailable" };
  }

  return {
    status: "ready",
    plans: (data ?? []).map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      currency: "MXN",
      durationDays: plan.duration_days,
      benefits: asStringArray(plan.benefits),
    })),
  };
});

export const listAdminSubscriptionPlans = cache(async (): Promise<{
  plans: AdminSubscriptionPlan[];
  status: "ready" | "not_configured" | "unavailable";
}> => {
  if (!getSupabasePublicConfig()) return { plans: [], status: "not_configured" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, slug, name, description, price, currency, duration_days, benefits, is_active")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[subscriptions] No se pudieron consultar los planes de administración", { code: error.code });
    return { plans: [], status: "unavailable" };
  }

  return {
    status: "ready",
    plans: (data ?? []).map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      currency: "MXN",
      durationDays: plan.duration_days,
      benefits: asStringArray(plan.benefits),
      isActive: plan.is_active,
    })),
  };
});

export const hasActivePremiumSubscription = cache(async (userId: string): Promise<boolean> => {
  if (!getSupabasePublicConfig()) return false;
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code !== "PGRST205" && error.code !== "42P01") {
      console.error("[subscriptions] No se pudo comprobar Premium", { code: error.code });
    }
    return false;
  }
  return Boolean(data);
});

export const getLatestSubscription = cache(async (userId: string): Promise<CurrentSubscription | null> => {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const activeResult = await supabase
    .from("subscriptions")
    .select("id, status, starts_at, expires_at, subscription_plans(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeResult.error) {
    console.error("[subscriptions] No se pudo consultar la suscripción activa", { code: activeResult.error.code });
    return null;
  }

  const { data, error } = activeResult.data ? activeResult : await supabase
    .from("subscriptions")
    .select("id, status, starts_at, expires_at, subscription_plans(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[subscriptions] No se pudo consultar la suscripción", { code: error.code });
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    status: visibleSubscriptionStatus(data.status, data.expires_at),
    startsAt: data.starts_at,
    expiresAt: data.expires_at,
    planName: joinedName(data.subscription_plans, "Plan Premium"),
  };
});

const ownHistorySelect = "id, status, starts_at, expires_at, created_at, subscription_plans(name), payment_simulations(id, result, amount, currency, simulation_reference, created_at)";
const adminHistorySelect = `${ownHistorySelect}, user_id, profiles!user_id(display_name)`;

export const listOwnSubscriptionHistory = cache(async (userId: string): Promise<SubscriptionHistoryItem[]> => {
  if (!getSupabasePublicConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(ownHistorySelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[subscriptions] No se pudo consultar el historial", { code: error.code });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    status: visibleSubscriptionStatus(row.status, row.expires_at),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    planName: joinedName(row.subscription_plans, "Plan Premium"),
    createdAt: row.created_at,
    simulation: latestSimulation(row.payment_simulations),
  }));
});

export const listAdminSubscriptions = cache(async (): Promise<AdminSubscriptionRow[]> => {
  if (!getSupabasePublicConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(adminHistorySelect)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("[subscriptions] No se pudo consultar el historial administrativo", { code: error.code });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: joinedDisplayName(row.profiles),
    status: visibleSubscriptionStatus(row.status, row.expires_at),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    planName: joinedName(row.subscription_plans, "Plan Premium"),
    createdAt: row.created_at,
    simulation: latestSimulation(row.payment_simulations),
  }));
});
