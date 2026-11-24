import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPage } from "@/features/auth/components/auth-page";
import { signUpAction } from "@/features/auth/actions/auth-actions";

export const metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthPage
      alternate={{ href: "/login", label: "¿Ya tienes una cuenta?", linkText: "Iniciar sesión" }}
      description="Crea tu cuenta para guardar y organizar tus espacios favoritos."
      eyebrow="Bienvenido a Paradise"
      title="Empecemos por conocerte."
    >
      <AuthForm action={signUpAction} submitLabel="Crear cuenta">
        <label className="auth-field">
          <span>Nombre</span>
          <input autoComplete="name" maxLength={120} minLength={2} name="displayName" required />
        </label>
        <label className="auth-field">
          <span>Correo electrónico</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label className="auth-field">
          <span>Contraseña</span>
          <input autoComplete="new-password" maxLength={128} minLength={10} name="password" required type="password" />
          <small>Usa al menos 10 caracteres.</small>
        </label>
      </AuthForm>
    </AuthPage>
  );
}
