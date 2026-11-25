import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/supabase/config", () => ({ getSupabasePublicConfig: () => ({ url: "https://example.supabase.co" }) }));

function request(query: string) { return new NextRequest(`https://paradise.example/auth/callback?${query}`); }

beforeEach(() => {
  vi.clearAllMocks();
  auth.exchangeCodeForSession.mockResolvedValue({ data: { redirectType: null }, error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
});

describe("Auth callback", () => {
  it("confirms signup PKCE without a next query parameter", async () => {
    const response = await GET(request("code=test"));
    expect(response.headers.get("location")).toBe("https://paradise.example/verificar-email?verified=1");
  });
  it("recovers the password destination from PKCE when next is missing", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: { redirectType: "recovery" }, error: null });
    const response = await GET(request("code=test"));
    expect(response.headers.get("location")).toBe("https://paradise.example/auth/cambiar-password");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("verifies recovery tokens without requiring a PKCE cookie", async () => {
    const response = await GET(request("token_hash=test&type=recovery"));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "test", type: "recovery" });
    expect(response.headers.get("location")).toBe("https://paradise.example/auth/cambiar-password");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("confirms email tokens", async () => {
    const response = await GET(request("token_hash=test&type=email"));
    expect(response.headers.get("location")).toBe("https://paradise.example/verificar-email?verified=1");
  });
  it("rejects unsupported token types without consuming the token", async () => {
    const response = await GET(request("token_hash=test&type=invalid"));
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("auth-error=verification");
  });
  it("does not allow external next destinations", async () => {
    const response = await GET(request("code=test&next=https://attacker.example"));
    expect(response.headers.get("location")).toBe("https://paradise.example/");
  });
  it("returns failed recovery links to the recovery form", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired", status: 403 } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request("token_hash=test&type=recovery"));
    expect(response.headers.get("location")).toBe("https://paradise.example/recuperar-password?expired=1");
    expect(log).toHaveBeenCalledWith("[auth:callback] Verification failed", { code: "otp_expired", status: 403 });
    log.mockRestore();
  });
  it("rejects missing credentials and provider errors", async () => {
    for (const query of ["", "error=access_denied&code=test"]) {
      const response = await GET(request(query));
      expect(response.headers.get("location")).toContain("auth-error=verification");
    }
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
