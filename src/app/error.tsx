"use client";

export default function ErrorPage({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Ocurrió un error inesperado.
      </h1>
      <p>Intenta cargar esta página de nuevo.</p>
      <button
        className="rounded-md border px-4 py-2 font-medium"
        onClick={() => reset()}
        type="button"
      >
        Reintentar
      </button>
    </main>
  );
}
