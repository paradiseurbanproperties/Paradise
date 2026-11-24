import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em]">
        Error 404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        No encontramos esta página.
      </h1>
      <Link className="underline underline-offset-4" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
