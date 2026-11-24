"use client";

import { useActionState } from "react";
import {
  adminCancelPremiumSubscriptionAction,
} from "@/features/subscriptions/actions/premium-membership-actions";
import { EMPTY_MEMBERSHIP_ACTION_STATE } from "@/features/subscriptions/types/action-state";

export function AdminCancelSubscriptionForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, formAction, pending] = useActionState(adminCancelPremiumSubscriptionAction, EMPTY_MEMBERSHIP_ACTION_STATE);

  return (
    <form action={formAction} className="admin-cancel-subscription-form">
      <input name="subscriptionId" type="hidden" value={subscriptionId} />
      <button className="button button--secondary button--small" disabled={pending} type="submit">
        {pending ? "Cancelando…" : "Cancelar vigencia"}
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
