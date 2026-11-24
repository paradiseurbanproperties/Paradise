import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPage } from "@/features/auth/components/auth-page";
import { signInAction } from "@/features/auth/actions/auth-actions";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "auth-error"?: string; account?: string; "password-updated"?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthPage
      alternate={{ href: "/registro", label: "¿Aún no tienes una cuenta?", linkText: "Crear cuenta" }}
      description="Accede a tu espacio Paradise para continuar tu búsqueda."
      eyebrow="Tu espacio Paradise"
      title="Qué gusto verte de nuevo."
    >
      {params["auth-error"] === "verification" ? (
        <p className="auth-form__feedback auth-form__feedback--error" role="alert">
          No pudimos verificar el correo. El enlace puede haber vencido o ya se utilizó; solicita uno nuevo e intenta abrirlo en el mismo navegador donde iniciaste el registro.
        </p>
      ) : null}
      {params.account === "suspended" ? (
        <p className="auth-form__feedback auth-form__feedback--error" role="alert">
          Esta cuenta está suspendida. Contacta al equipo de Paradise para recibir ayuda.
        </p>
      ) : null}
      {params["password-updated"] === "1" ? (
        <p className="auth-form__feedback auth-form__feedback--success" role="status">
          Tu contraseña se actualizó. Ya puedes iniciar sesión.
        </p>
      ) : null}
      <AuthForm action={signInAction} submitLabel="Iniciar sesión">
        <label className="auth-field">
          <span>Correo electrónico</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label className="auth-field">
          <span>Contraseña</span>
          <input autoComplete="current-password" maxLength={128} name="password" required type="password" />
        </label>
        <Link className="auth-form__help-link" href="/recuperar-password">¿Olvidaste tu contraseña?</Link>
      </AuthForm>
    </AuthPage>
  );
}
