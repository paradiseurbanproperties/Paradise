"use client";

import { useActionState } from "react";
import { updateAccountAccessAction } from "@/features/users/actions/admin-access-actions";
import type { AuthActionState } from "@/features/auth/types/auth-action";
import type { AccountStatus, ProfileRole } from "@/constants/access";

type AccountAccessFormProps = {
  userId: string;
  role: ProfileRole;
  status: AccountStatus;
  isSelf?: boolean;
};

const initialState: AuthActionState = { status: "idle", message: "" };

export function AccountAccessForm({ userId, role, status, isSelf = false }: AccountAccessFormProps) {
  const [state, formAction, pending] = useActionState(updateAccountAccessAction, initialState);

  if (isSelf) {
    return <p className="account-access-form__self-note">Tu acceso se protege desde otra cuenta Admin.</p>;
  }

  return (
    <form action={formAction} className="account-access-form">
      <input name="targetUserId" type="hidden" value={userId} />
      <label>
        <span className="visually-hidden">Rol de la cuenta</span>
        <select aria-label="Rol de la cuenta" defaultValue={role} name="role">
          <option value="client">Cliente</option>
          <option value="agent">Agente</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <label>
        <span className="visually-hidden">Estado de la cuenta</span>
        <select aria-label="Estado de la cuenta" defaultValue={status} name="status">
          <option value="active">Activa</option>
          <option value="suspended">Suspendida</option>
        </select>
      </label>
      <button className="button button--secondary button--small" disabled={pending} type="submit">
        {pending ? "Guardando…" : "Guardar acceso"}
      </button>
      {state.message ? (
        <span
          aria-live="polite"
          className={`account-access-form__feedback account-access-form__feedback--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
