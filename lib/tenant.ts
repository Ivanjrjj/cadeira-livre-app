import { createServerSupabase } from "./supabase/server";

export type TenantTheme = {
  ink?: string;
  cream?: string;
  red?: string;
  navy?: string;
  brass?: string;
  display_font?: string;
  body_font?: string;
};

export type Barber = {
  id: string;
  display_name: string;
  role_label: string;
  photo_url: string | null;
};

export type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  theme: TenantTheme;
  barbers: Barber[];
  services: Service[];
};

// Busca tudo que uma página de barbearia precisa de uma vez: a própria
// barbearia, os barbeiros ativos e os serviços, na ordem certa.
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = await createServerSupabase();

  const { data: barbershop, error } = await supabase
    .from("barbershops")
    .select("id, slug, name, city, theme")
    .eq("slug", slug)
    .single();

  // PGRST116 = "nenhuma linha encontrada", que é um "não existe" legítimo.
  // Qualquer outro erro (permissão, tabela errada, etc) precisa aparecer,
  // não ser tratado como se a barbearia simplesmente não existisse.
  if (error && error.code !== "PGRST116") {
    throw new Error(`Erro ao buscar barbearia "${slug}": ${error.message} (code: ${error.code})`);
  }

  if (!barbershop) return null;

  const [{ data: barbers }, { data: services }] = await Promise.all([
    supabase
      .from("barbers")
      .select("id, display_name, role_label, photo_url")
      .eq("barbershop_id", barbershop.id)
      .eq("active", true),
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("barbershop_id", barbershop.id)
      .order("sort_order"),
  ]);

  return {
    ...barbershop,
    barbers: barbers ?? [],
    services: services ?? [],
  };
}
