/** A donde vuelve Stripe tras el pago o el portal. La app abrió Stripe en un
 * navegador dentro de ella: al cerrarlo, vuelve y relee el acceso sola. */
export default async function PagoPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const [title, body] =
    estado === "ok"
      ? ["Pago completado", "Cierra esta ventana para volver a TrueRep. Tu acceso se activa en unos segundos."]
      : estado === "cancelado"
        ? ["Pago cancelado", "No se ha cobrado nada. Cierra esta ventana para volver a TrueRep."]
        : ["Listo", "Cierra esta ventana para volver a TrueRep."];
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-[#666]">{body}</p>
    </main>
  );
}
