import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPage } from "@/features/auth/components/auth-page";
import { requestPasswordRecoveryAction } from "@/features/auth/actions/auth-actions";

export const metadata = { title: "Recuperar contraseña" };

export default async function RecoverPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      alternate={{ href: "/login", label: "¿Recordaste tu contraseña?", linkText: "Volver al acceso" }}
      description="Te enviaremos instrucciones si existe una cuenta asociada a ese correo."
      eyebrow="Recuperar acceso"
      title="Volvamos a entrar."
    >
      {params.expired === "1" ? (
        <p className="auth-form__feedback auth-form__feedback--error" role="alert">
          No pudimos validar el enlace. Puede haber vencido o ya haberse utilizado.
          Solicita otro correo y abre el enlace más reciente en el navegador donde lo pediste.
        </p>
      ) : null}
      <AuthForm action={requestPasswordRecoveryAction} submitLabel="Enviar instrucciones">
        <label className="auth-field">
          <span>Correo electrónico</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
      </AuthForm>
    </AuthPage>
  );
}
