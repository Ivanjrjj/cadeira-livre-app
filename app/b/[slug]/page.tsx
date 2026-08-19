import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import BookingFlow from "@/components/BookingFlow";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <div>
      <header className="border-b-4 border-brass bg-ink text-cream py-8 px-6 text-center relative">
        <a
          href={`/b/${tenant.slug}/meus-agendamentos`}
          className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-widest text-brass/80 border border-brass/40 rounded-full px-3 py-1.5 hover:bg-brass/10"
        >
          Meus agendamentos
        </a>
        <a
          href={`/b/${tenant.slug}/barbeiro`}
          className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest text-brass/80 border border-brass/40 rounded-full px-3 py-1.5 hover:bg-brass/10"
        >
          Área do barbeiro
        </a>
        <h1 className="font-bold text-3xl uppercase tracking-wide">{tenant.name}</h1>
        {tenant.city && <p className="text-brass text-xs font-mono mt-2 uppercase tracking-widest">{tenant.city}</p>}
      </header>
      <BookingFlow tenant={tenant} />
    </div>
  );
}
