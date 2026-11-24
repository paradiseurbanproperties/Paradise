"use client";

import { useActionState } from "react";
import { saveAgentProfileAction } from "@/features/agents/actions/admin-agent-actions";
import type { AgentProfile } from "@/features/agents/repositories/agent-repository";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialState: AuthActionState = { status: "idle", message: "" };

function makeSlug(value: string, profileId: string) {
  const base = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "agente"}-${profileId.slice(0, 6)}`;
}

export function AdminAgentProfileForm({
  profileId,
  displayName,
  accountStatus,
  profile,
}: {
  profileId: string;
  displayName: string;
  accountStatus: "active" | "suspended";
  profile: AgentProfile | null;
}) {
  const [state, formAction, pending] = useActionState(saveAgentProfileAction, initialState);
  return (
    <form action={formAction} className="agent-admin-form">
      <input name="profileId" type="hidden" value={profileId} />
      <header className="agent-admin-form__heading">
        <div>
          <h3>{profile?.publicName ?? (displayName || "Agente sin nombre")}</h3>
          <p>{accountStatus === "active" ? "Cuenta activa" : "Cuenta suspendida"}{accountStatus === "suspended" ? " · no aparecerá públicamente" : ""}</p>
        </div>
        <span className={`agent-admin-form__badge${profile?.isPublic ? " agent-admin-form__badge--public" : ""}`}>
          {profile?.isPublic ? "Publicado" : profile ? "Borrador" : "Sin perfil"}
        </span>
      </header>
      <div className="agent-admin-form__grid">
        <label className="auth-field">
          <span>Nombre público</span>
          <input defaultValue={profile?.publicName ?? displayName} maxLength={120} name="publicName" required />
        </label>
        <label className="auth-field">
          <span>Enlace del perfil</span>
          <input defaultValue={profile?.slug ?? makeSlug(displayName, profileId)} maxLength={100} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
        </label>
        <label className="auth-field agent-admin-form__wide">
          <span>Biografía</span>
          <textarea defaultValue={profile?.biography ?? ""} maxLength={2400} name="biography" rows={4} />
        </label>
        <label className="auth-field">
          <span>Especialidades · una por línea</span>
          <textarea defaultValue={profile?.specialties.join("\n") ?? ""} name="specialties" rows={4} />
        </label>
        <label className="auth-field">
          <span>Zonas de servicio · una por línea</span>
          <textarea defaultValue={profile?.serviceAreas.join("\n") ?? ""} name="serviceAreas" rows={4} />
        </label>
      </div>
      <label className="agent-admin-form__publish">
        <input defaultChecked={profile?.isPublic ?? false} name="isPublic" type="checkbox" />
        <span>Publicar en el directorio de agentes</span>
      </label>
      <div className="agent-admin-form__actions">
        <button className="button button--primary button--small" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar perfil"}
        </button>
        {state.message ? <p aria-live="polite" className={`agent-admin-form__feedback agent-admin-form__feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      </div>
    </form>
  );
}
