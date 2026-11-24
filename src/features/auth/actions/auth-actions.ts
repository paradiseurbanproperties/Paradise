"use server";

import { redirect } from "next/navigation";
import { createAuthRedirectUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formDataRecord,
  recoveryEmailSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas/auth";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const configurationMessage = "Conexión con Supabase pendiente. Completa las variables de .env.local.";

function invalidFormMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabasePublicConfig()) return { status: "error", message: configurationMessage };
  const parsed = signInSchema.safeParse(formDataRecord(formData));
  if (!parsed.success) return { status: "error", message: invalidFormMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo." };
  redirect("/");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabasePublicConfig()) return { status: "error", message: configurationMessage };
  const parsed = signUpSchema.safeParse(formDataRecord(formData));
  if (!parsed.success) return { status: "error", message: invalidFormMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: createAuthRedirectUrl("/auth/callback?next=%2Fverificar-email"),
    },
  });

  if (error) {
    return { status: "error", message: "No se pudo crear la cuenta. Revisa los datos o prueba iniciar sesión." };
  }
  if (data.session) redirect("/");
  return {
    status: "success",
    message: "Te enviamos un correo para verificar tu cuenta. Revisa también la carpeta de correo no deseado.",
  };
}

export async function requestPasswordRecoveryAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabasePublicConfig()) return { status: "error", message: configurationMessage };
  const parsed = recoveryEmailSchema.safeParse(formDataRecord(formData));
  if (!parsed.success) return { status: "error", message: invalidFormMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: createAuthRedirectUrl("/auth/callback?next=%2Fauth%2Fcambiar-password"),
  });
  if (error) return { status: "error", message: "No pudimos iniciar el proceso. Inténtalo de nuevo más tarde." };

  return {
    status: "success",
    message: "Si el correo está registrado, recibirás instrucciones para cambiar tu contraseña.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabasePublicConfig()) return { status: "error", message: configurationMessage };
  const parsed = updatePasswordSchema.safeParse(formDataRecord(formData));
  if (!parsed.success) return { status: "error", message: invalidFormMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { status: "error", message: "El enlace venció o ya fue utilizado. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "No se pudo actualizar la contraseña. Solicita un enlace nuevo." };
  redirect("/login?password-updated=1");
}

export async function signOutAction() {
  if (!getSupabasePublicConfig()) redirect("/");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
