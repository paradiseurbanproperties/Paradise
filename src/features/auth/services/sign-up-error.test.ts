import { describe, expect, it } from "vitest";
import { getSignUpErrorMessage } from "./sign-up-error";

describe("mensajes seguros para errores de registro", () => {
  it("explica contraseña débil, registro desactivado y límites de correo", () => {
    expect(getSignUpErrorMessage({ code: "weak_password" })).toContain("requisitos de seguridad");
    expect(getSignUpErrorMessage({ code: "signup_disabled" })).toContain("desactivado");
    expect(getSignUpErrorMessage({ code: "over_email_send_rate_limit" })).toContain("Espera unos minutos");
  });

  it("no revela si una dirección ya tiene una cuenta", () => {
    const message = getSignUpErrorMessage({ code: "user_already_exists", status: 422 });
    expect(message).toContain("inicia sesión o recupera tu contraseña");
    expect(message).not.toContain("ya existe");
  });

  it("da una respuesta segura para errores no clasificados y límites HTTP", () => {
    expect(getSignUpErrorMessage({ status: 429 })).toContain("Espera unos minutos");
    expect(getSignUpErrorMessage({ code: "unexpected_failure", status: 500 })).toContain("No se pudo completar el registro");
  });
});
