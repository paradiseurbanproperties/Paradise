import type { AuthActionState } from "@/features/auth/types/auth-action";

export type PremiumCheckoutState = {
  status: "idle" | "success" | "declined" | "error";
  message: string;
  planId?: string;
};

export const EMPTY_PREMIUM_CHECKOUT_STATE: PremiumCheckoutState = {
  status: "idle",
  message: "",
};

export const EMPTY_MEMBERSHIP_ACTION_STATE: AuthActionState = {
  status: "idle",
  message: "",
};
