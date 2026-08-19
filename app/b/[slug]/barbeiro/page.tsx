import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import BarberPanel from "@/components/BarberPanel";

export default async function BarberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <div>
      <header className="border-b-4 border-brass bg-ink text-cream py-6 px-6 text-center relative">
        <h1 className="font-bold text-2xl uppercase tracking-wide">{tenant.name}</h1>
        <p className="text-brass text-xs font-mono mt-1">Painel do barbeiro</p>
      </header>
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <a
          href={`/b/${tenant.slug}`}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-navy border border-navy/30 rounded-full px-4 py-2 hover:bg-navy/5"
        >
          ← Ver como cliente
        </a>
      </div>
      <BarberPanel tenant={tenant} />
    </div>
  );
}
