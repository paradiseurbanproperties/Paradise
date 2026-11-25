import { expect, it, vi } from "vitest";
import { requestPasswordRecoveryAction, signUpAction } from "@/features/auth/actions/auth-actions";

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: () => ({}),
  createAuthRedirectUrl: (path: string) => new URL(path, "https://paradise.example").toString(),
}));

it("requests signup and recovery with the exact allowlisted callback", async () => {
  const form = new FormData();
  form.set("email", "client@example.com");
  form.set("password", "a-long-test-password");
  form.set("displayName", "Cliente de prueba");
  const state = { status: "idle" as const, message: "" };
  await requestPasswordRecoveryAction(state, form);
  await signUpAction(state, form);
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("client@example.com", {
    redirectTo: "https://paradise.example/auth/callback",
  });
  expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
    options: expect.objectContaining({ emailRedirectTo: "https://paradise.example/auth/callback" }),
  }));
});
