import Link from "next/link";
import { AuthPage } from "@/features/auth/components/auth-page";

export const metadata = { title: "Verificar correo" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;
  return (
    <AuthPage
      alternate={{ href: "/login", label: "¿Ya verificaste tu correo?", linkText: "Iniciar sesión" }}
      description={verified === "1"
        ? "Tu correo quedó verificado. Ya puedes iniciar sesión."
        : "Revisa tu correo y abre el enlace de verificación para activar tu cuenta."}
      eyebrow="Un paso más"
      title={verified === "1" ? "Tu cuenta está lista." : "Confirma tu correo."}
    >
      <div className="auth-message-panel">
        <p>Si no ves el mensaje, revisa la carpeta de correo no deseado. Los enlaces se envían desde la configuración de Auth de tu proyecto Supabase.</p>
        <Link className="button button--secondary button--medium" href="/login">Ir a iniciar sesión</Link>
      </div>
    </AuthPage>
  );
}
