import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPage } from "@/features/auth/components/auth-page";
import { updatePasswordAction } from "@/features/auth/actions/auth-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata = { title: "Cambiar contraseña" };

export default async function UpdatePasswordPage() {
  if (getSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) redirect("/recuperar-password?expired=1");
  }

  return (
    <AuthPage
      description="Elige una contraseña nueva para proteger tu cuenta."
      eyebrow="Actualizar acceso"
      title="Crea una contraseña nueva."
    >
      <AuthForm action={updatePasswordAction} submitLabel="Actualizar contraseña">
        <label className="auth-field">
          <span>Nueva contraseña</span>
          <input autoComplete="new-password" maxLength={128} minLength={10} name="password" required type="password" />
        </label>
        <label className="auth-field">
          <span>Confirma la contraseña</span>
          <input autoComplete="new-password" maxLength={128} minLength={10} name="passwordConfirmation" required type="password" />
        </label>
      </AuthForm>
    </AuthPage>
  );
}
