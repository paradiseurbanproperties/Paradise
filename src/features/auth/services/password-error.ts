type AuthError = { code?: string; status?: number };

export function getPasswordErrorMessage(error: AuthError, operation: "request" | "update") {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Se hicieron demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  }
  if (operation === "update") {
    if (error.code === "same_password") return "Elige una contraseña diferente de la actual.";
    if (error.code === "weak_password") return "Usa una contraseña de al menos 10 caracteres que cumpla los requisitos de seguridad y evita contraseñas comunes.";
    if (error.code === "session_not_found" || error.code === "refresh_token_not_found" || error.code === "otp_expired") {
      return "El enlace venció o ya se utilizó. Solicita un nuevo correo de recuperación.";
    }
    return "No pudimos actualizar la contraseña. Inténtalo de nuevo o solicita otro correo de recuperación.";
  }
  return "No pudimos enviar las instrucciones. Inténtalo más tarde. Si continúa, contacta al equipo de Paradise.";
}
