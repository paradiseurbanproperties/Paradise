import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPage } from "@/features/auth/components/auth-page";
import { requestPasswordRecoveryAction } from "@/features/auth/actions/auth-actions";

export const metadata = { title: "Recuperar contraseña" };

export default function RecoverPasswordPage() {
  return (
    <AuthPage
      alternate={{ href: "/login", label: "¿Recordaste tu contraseña?", linkText: "Volver al acceso" }}
      description="Te enviaremos instrucciones si existe una cuenta asociada a ese correo."
      eyebrow="Recuperar acceso"
      title="Volvamos a entrar."
    >
      <AuthForm action={requestPasswordRecoveryAction} submitLabel="Enviar instrucciones">
        <label className="auth-field">
          <span>Correo electrónico</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
      </AuthForm>
    </AuthPage>
  );
}
