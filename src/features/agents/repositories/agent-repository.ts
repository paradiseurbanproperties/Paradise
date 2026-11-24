import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type AgentProfile = {
  profileId: string;
  slug: string;
  publicName: string;
  biography: string;
  specialties: string[];
  serviceAreas: string[];
  isPublic: boolean;
};

export type AdminAgentAccount = {
  id: string;
  displayName: string;
  accountStatus: "active" | "suspended";
  agentProfile: AgentProfile | null;
  assignments: AgentAssignedProperty[];
};

export type AgentAssignedProperty = {
  assignmentId: string;
  assignedAt: string;
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  price: number;
  status: "available" | "in_deal" | "sold";
  publicationStatus: "draft" | "pending" | "approved" | "rejected" | "archived";
  visibility: "public" | "premium" | "both";
};

export type AssignableProperty = Pick<AgentAssignedProperty, "id" | "title" | "city" | "state">;

type AgentRow = {
  profile_id: string;
  slug: string;
  public_name: string;
  biography: string;
  specialties: string[];
  service_areas: string[];
  is_public: boolean;
};

function mapAgent(row: AgentRow): AgentProfile {
  return {
    profileId: row.profile_id,
    slug: row.slug,
    publicName: row.public_name,
    biography: row.biography,
    specialties: row.specialties ?? [],
    serviceAreas: row.service_areas ?? [],
    isPublic: row.is_public,
  };
}

export async function listAdminAgentAccounts(): Promise<{ accounts: AdminAgentAccount[]; assignableProperties: AssignableProperty[]; unavailable: boolean }> {
  const supabase = await createSupabaseServerClient();
  const [{ data: profiles, error: profilesError }, { data: agentRows, error: agentsError }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, account_status").eq("base_role", "agent").order("created_at", { ascending: false }),
    supabase.from("agents").select("profile_id, slug, public_name, biography, specialties, service_areas, is_public"),
  ]);

  if (profilesError || agentsError) {
    console.error("[agents] No se pudieron cargar los perfiles de agente", { code: profilesError?.code ?? agentsError?.code });
    return { accounts: [], assignableProperties: [], unavailable: true };
  }

  const profileIds = (profiles ?? []).map((profile) => profile.id);
  const [{ data: assignments, error: assignmentsError }, { data: propertyRows, error: propertiesError }] = profileIds.length
    ? await Promise.all([
        supabase.from("agent_assignments").select("id, agent_id, assigned_at, properties!inner(id, slug, title, city, state, price, status, publication_status, visibility)").in("agent_id", profileIds).is("revoked_at", null).order("assigned_at", { ascending: false }),
        supabase.from("properties").select("id, title, city, state").order("updated_at", { ascending: false }).limit(500),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (assignmentsError || propertiesError) {
    console.error("[agents] No se pudieron cargar las asignaciones", { code: assignmentsError?.code ?? propertiesError?.code });
    return { accounts: [], assignableProperties: [], unavailable: true };
  }

  type AssignmentRow = {
    id: string;
    agent_id: string;
    assigned_at: string;
    properties: {
      id: string;
      slug: string;
      title: string;
      city: string;
      state: string;
      price: number | string;
      status: AgentAssignedProperty["status"];
      publication_status: AgentAssignedProperty["publicationStatus"];
      visibility: AgentAssignedProperty["visibility"];
    };
  };
  const assignmentsByAgent = new Map<string, AgentAssignedProperty[]>();
  for (const row of (assignments ?? []) as unknown as AssignmentRow[]) {
    const list = assignmentsByAgent.get(row.agent_id) ?? [];
    list.push({
      assignmentId: row.id,
      assignedAt: row.assigned_at,
      ...row.properties,
      price: Number(row.properties.price),
      publicationStatus: row.properties.publication_status,
    });
    assignmentsByAgent.set(row.agent_id, list);
  }

  const profilesById = new Map(((agentRows ?? []) as AgentRow[]).map((row) => [row.profile_id, mapAgent(row)]));
  return {
    accounts: (profiles ?? []).map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      accountStatus: profile.account_status === "suspended" ? "suspended" : "active",
      agentProfile: profilesById.get(profile.id) ?? null,
      assignments: assignmentsByAgent.get(profile.id) ?? [],
    })),
    unavailable: false,
    assignableProperties: (propertyRows ?? []).map((property) => ({
      id: property.id,
      title: property.title,
      city: property.city,
      state: property.state,
    })),
  };
}

export async function listAssignedAgentProperties(agentId: string): Promise<{ properties: AgentAssignedProperty[]; unavailable: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agent_assignments")
    .select("id, assigned_at, properties!inner(id, slug, title, city, state, price, status, publication_status, visibility)")
    .eq("agent_id", agentId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });
  if (error) {
    console.error("[agents] No se pudieron cargar las propiedades asignadas", { code: error.code });
    return { properties: [], unavailable: true };
  }

  type AssignmentRow = {
    id: string;
    assigned_at: string;
    properties: {
      id: string;
      slug: string;
      title: string;
      city: string;
      state: string;
      price: number | string;
      status: AgentAssignedProperty["status"];
      publication_status: AgentAssignedProperty["publicationStatus"];
      visibility: AgentAssignedProperty["visibility"];
    };
  };
  return {
    properties: ((data ?? []) as unknown as AssignmentRow[]).map((row) => ({
      assignmentId: row.id,
      assignedAt: row.assigned_at,
      ...row.properties,
      price: Number(row.properties.price),
      publicationStatus: row.properties.publication_status,
    })),
    unavailable: false,
  };
}

export async function listPublicAgents(): Promise<AgentProfile[]> {
  if (!getSupabasePublicConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agents")
    .select("profile_id, slug, public_name, biography, specialties, service_areas, is_public")
    .eq("is_public", true)
    .order("public_name");
  if (error) {
    console.error("[agents] No se pudo cargar el directorio público", { code: error.code });
    return [];
  }
  return ((data ?? []) as AgentRow[]).map(mapAgent);
}

export async function findPublicAgentBySlug(slug: string): Promise<AgentProfile | null> {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agents")
    .select("profile_id, slug, public_name, biography, specialties, service_areas, is_public")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) {
    console.error("[agents] No se pudo cargar el perfil público", { code: error.code });
    return null;
  }
  return data ? mapAgent(data as AgentRow) : null;
}
