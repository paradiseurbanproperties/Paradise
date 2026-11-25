type SignUpAuthError = {
  code?: string | null;
  status?: number | null;
};

const safeMessages: Record<string, string> = {
  signup_disabled: "El registro está desactivado en este momento. Inténtalo más tarde.",
  weak_password: "La contraseña no cumple los requisitos de seguridad. Usa al menos 10 caracteres y evita contraseñas comunes.",
  email_address_invalid: "No se pudo validar el correo. Revisa la dirección e inténtalo de nuevo.",
  over_email_send_rate_limit: "Se solicitaron demasiados correos en poco tiempo. Espera unos minutos antes de volver a intentarlo.",
  over_request_rate_limit: "Se hicieron demasiados intentos en poco tiempo. Espera unos minutos e inténtalo de nuevo.",
};

export function getSignUpErrorMessage(error: SignUpAuthError): string {
  if (error.code && safeMessages[error.code]) return safeMessages[error.code];
  if (error.status === 429) {
    return "Se hicieron demasiados intentos en poco tiempo. Espera unos minutos e inténtalo de nuevo.";
  }

  return "No se pudo completar el registro. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña. Si el problema continúa, vuelve a intentarlo más tarde.";
}
