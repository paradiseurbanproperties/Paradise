"use client";

import { useActionState, type ReactNode } from "react";
import type { AuthActionState, AuthServerAction } from "@/features/auth/types/auth-action";

type AuthFormProps = {
  action: AuthServerAction;
  children: ReactNode;
  submitLabel: string;
};

export function AuthForm({ action, children, submitLabel }: AuthFormProps) {
  const initialState: AuthActionState = { status: "idle", message: "" };
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="auth-form">
      {children}
      {state.message ? (
        <p
          aria-live="polite"
          className={`auth-form__feedback auth-form__feedback--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <button className="button button--primary button--large auth-form__submit" disabled={pending} type="submit">
        {pending ? "Procesando…" : submitLabel}
      </button>
    </form>
  );
}
