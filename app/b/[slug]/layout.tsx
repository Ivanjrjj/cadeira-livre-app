import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) notFound();

  const t = tenant.theme || {};

  // as cores dessa barbearia específica sobrescrevem as variáveis padrão
  // definidas em globals.css — é assim que cada tenant tem sua própria estética
  const themeStyle = {
    "--tenant-ink": t.ink || "#161311",
    "--tenant-cream": t.cream || "#efe6d3",
    "--tenant-red": t.red || "#a62422",
    "--tenant-navy": t.navy || "#1c3a5e",
    "--tenant-brass": t.brass || "#b98a2e",
  } as React.CSSProperties;

  return (
    <div style={themeStyle} className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
