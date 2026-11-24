"use client";

import { useActionState } from "react";
import { simulatePremiumCheckoutAction } from "@/features/subscriptions/actions/premium-checkout-action";
import { EMPTY_PREMIUM_CHECKOUT_STATE } from "@/features/subscriptions/types/action-state";
import type { SubscriptionPlan } from "@/features/subscriptions/repositories/subscription-repository";

function formatSimulatedPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export function PremiumPlanCard({ plan }: { plan: SubscriptionPlan }) {
  const [state, formAction, pending] = useActionState(simulatePremiumCheckoutAction, EMPTY_PREMIUM_CHECKOUT_STATE);
  const currentPlanResult = state.planId === plan.id;

  return (
    <article className="premium-plan-card">
      <p className="eyebrow">Plan Paradise</p>
      <h2>{plan.name}</h2>
      <p className="premium-plan-card__description">{plan.description}</p>
      <p className="premium-plan-card__price">
        <strong>{formatSimulatedPrice(plan.price, plan.currency)}</strong>
        <span>MXN simulados · {plan.durationDays} días</span>
      </p>
      {plan.benefits.length ? (
        <ul className="premium-plan-card__benefits">
          {plan.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
      ) : null}
      <form action={formAction} className="premium-plan-card__actions">
        <input name="planId" type="hidden" value={plan.id} />
        <button className="button button--primary button--medium" disabled={pending} name="simulatedResult" type="submit" value="succeeded">
          {pending ? "Procesando prueba…" : "Simular pago aprobado"}
        </button>
        <button className="premium-plan-card__decline" disabled={pending} name="simulatedResult" type="submit" value="declined">
          Simular pago rechazado
        </button>
        <p aria-live="polite" className={`premium-plan-card__feedback premium-plan-card__feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
          {currentPlanResult ? state.message : ""}
        </p>
      </form>
      <p className="premium-plan-card__disclaimer">Demostración académica. No solicites ni ingreses tarjetas o datos bancarios; no se procesa dinero real.</p>
    </article>
  );
}
