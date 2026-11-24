"use client";

import { useActionState } from "react";
import {
  cancelOwnPremiumSubscriptionAction,
} from "@/features/subscriptions/actions/premium-membership-actions";
import { EMPTY_MEMBERSHIP_ACTION_STATE } from "@/features/subscriptions/types/action-state";

export function PremiumCancelForm() {
  const [state, formAction, pending] = useActionState(cancelOwnPremiumSubscriptionAction, EMPTY_MEMBERSHIP_ACTION_STATE);

  return (
    <form action={formAction} className="premium-cancel-form">
      <input name="confirm" type="hidden" value="cancel" />
      <button className="premium-plan-card__decline" disabled={pending} type="submit">
        {pending ? "Cancelando…" : "Cancelar acceso Premium"}
      </button>
      <p className="premium-plan-card__disclaimer">
        Cancela solo la vigencia simulada. No hay cobros ni reembolsos reales.
      </p>
      {state.message ? (
        <p
          aria-live="polite"
          className={`premium-plan-card__feedback premium-plan-card__feedback--${state.status === "success" ? "success" : "error"}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
