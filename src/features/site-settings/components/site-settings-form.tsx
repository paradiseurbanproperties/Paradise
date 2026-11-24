"use client";

import { useActionState } from "react";
import { saveSiteSettingsAction } from "@/features/site-settings/actions/site-settings-actions";
import type { SiteSettings } from "@/features/site-settings/schemas/site-settings";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialState: AuthActionState = { status: "idle", message: "" };

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(saveSiteSettingsAction, initialState);
  return (
    <form action={formAction} className="agent-admin-form">
      <header className="agent-admin-form__heading">
        <div>
          <h2>Identidad y contacto público</h2>
          <p>Estos datos se muestran en el sitio y sus metadatos públicos.</p>
        </div>
      </header>
      <div className="agent-admin-form__grid">
        <label className="auth-field">
          <span>Nombre del sitio</span>
          <input defaultValue={settings.siteName} maxLength={100} name="siteName" required />
        </label>
        <label className="auth-field">
          <span>Frase de marca</span>
          <input defaultValue={settings.tagline} maxLength={180} name="tagline" />
        </label>
        <label className="auth-field agent-admin-form__wide">
          <span>Descripción para buscadores</span>
          <textarea defaultValue={settings.seoDescription} maxLength={300} name="seoDescription" rows={3} />
        </label>
        <label className="auth-field">
          <span>Correo público</span>
          <input autoComplete="email" defaultValue={settings.publicEmail} maxLength={254} name="publicEmail" type="email" />
        </label>
        <label className="auth-field">
          <span>Teléfono público</span>
          <input autoComplete="tel" defaultValue={settings.publicPhone} maxLength={40} name="publicPhone" type="tel" />
        </label>
      </div>
      <div className="agent-admin-form__actions">
        <button className="button button--primary button--small" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar configuración"}
        </button>
        {state.message ? <p aria-live="polite" className={`agent-admin-form__feedback agent-admin-form__feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      </div>
    </form>
  );
}
