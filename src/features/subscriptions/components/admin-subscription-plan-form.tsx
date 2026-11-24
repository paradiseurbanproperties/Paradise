"use client";

import { useActionState } from "react";
import {
  upsertSubscriptionPlanAction,
} from "@/features/subscriptions/actions/premium-membership-actions";
import { EMPTY_MEMBERSHIP_ACTION_STATE } from "@/features/subscriptions/types/action-state";
import type { AdminSubscriptionPlan } from "@/features/subscriptions/repositories/subscription-repository";

type AdminSubscriptionPlanFormProps = {
  plan?: AdminSubscriptionPlan;
};

export function AdminSubscriptionPlanForm({ plan }: AdminSubscriptionPlanFormProps) {
  const [state, formAction, pending] = useActionState(upsertSubscriptionPlanAction, EMPTY_MEMBERSHIP_ACTION_STATE);

  return (
    <form action={formAction} className="admin-plan-form">
      {plan ? <input name="planId" type="hidden" value={plan.id} /> : null}
      <label className="auth-field">
        <span>Identificador</span>
        <input
          defaultValue={plan?.slug ?? ""}
          maxLength={80}
          minLength={3}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="premium-mensual"
          readOnly={Boolean(plan)}
          required
        />
      </label>
      <label className="auth-field">
        <span>Nombre</span>
        <input defaultValue={plan?.name ?? ""} maxLength={80} minLength={3} name="name" required />
      </label>
      <label className="auth-field">
        <span>Descripción</span>
        <textarea defaultValue={plan?.description ?? ""} maxLength={400} name="description" rows={3} />
      </label>
      <div className="admin-plan-form__row">
        <label className="auth-field">
          <span>Precio simulado (MXN)</span>
          <input defaultValue={plan?.price ?? 299} min={0} name="price" required step="0.01" type="number" />
        </label>
        <label className="auth-field">
          <span>Duración (días)</span>
          <input defaultValue={plan?.durationDays ?? 30} max={3650} min={1} name="durationDays" required type="number" />
        </label>
      </div>
      <label className="auth-field">
        <span>Beneficios (uno por línea)</span>
        <textarea defaultValue={plan?.benefits.join("\n") ?? ""} name="benefits" rows={4} />
      </label>
      <label className="admin-plan-form__active">
        <input defaultChecked={plan?.isActive ?? true} name="isActive" type="checkbox" />
        <span>Plan activo y visible para clientes</span>
      </label>
      <button className="button button--primary button--medium" disabled={pending} type="submit">
        {pending ? "Guardando…" : plan ? "Guardar cambios" : "Crear plan"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`admin-property-feedback admin-property-feedback--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
