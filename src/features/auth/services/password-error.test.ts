import { describe, expect, it } from "vitest";
import { getPasswordErrorMessage } from "./password-error";

describe("password errors", () => {
  it("distinguishes unchanged passwords from expired links", () => {
    expect(getPasswordErrorMessage({ code: "same_password" }, "update")).toContain("diferente");
    expect(getPasswordErrorMessage({ code: "otp_expired" }, "update")).toContain("venció");
  });
  it("explains email limits and never reveals account existence", () => {
    expect(getPasswordErrorMessage({ status: 429 }, "request")).toContain("Espera");
    expect(getPasswordErrorMessage({ code: "user_not_found" }, "request")).toBe(getPasswordErrorMessage({}, "request"));
  });
});
