import { z } from "zod";

const emailSchema = z.string().trim().email("Escribe un correo válido.").max(254);
const passwordSchema = z.string().min(10, "Usa al menos 10 caracteres.").max(128);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const recoveryEmailSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  passwordConfirmation: z.string(),
}).refine((values) => values.password === values.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Las contraseñas no coinciden.",
});

export function formDataRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
