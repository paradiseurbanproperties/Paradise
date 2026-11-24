import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { PROFILE_ROLES, type AccountStatus, type ProfileRole } from "@/constants/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export { PROFILE_ROLES } from "@/constants/access";

export type AccessContext = {
  userId: string;
  role: ProfileRole;
  status: AccountStatus;
  displayName: string;
};

function isProfileRole(value: unknown): value is ProfileRole {
  return typeof value === "string" && PROFILE_ROLES.includes(value as ProfileRole);
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "suspended";
}

export const getCurrentAccessContext = cache(async (): Promise<AccessContext | null> => {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, base_role, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile || !isProfileRole(profile.base_role) || !isAccountStatus(profile.account_status)) {
    return null;
  }

  return {
    userId: profile.id,
    role: profile.base_role,
    status: profile.account_status,
    displayName: profile.display_name,
  };
});

export async function requireActiveProfile(): Promise<AccessContext> {
  const access = await getCurrentAccessContext();
  if (!access) redirect("/login");
  if (access.status !== "active") redirect("/login?account=suspended");
  return access;
}

export async function requireProfileRole(allowedRoles: readonly ProfileRole[]): Promise<AccessContext> {
  const access = await requireActiveProfile();
  if (!allowedRoles.includes(access.role)) notFound();
  return access;
}
