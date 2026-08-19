"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant, Barber } from "@/lib/tenant";

const DEFAULT_SLOTS = ["09:00", "09:45", "10:30", "11:15", "14:00", "14:45", "15:30", "16:15", "17:00"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

type SlotRow = { time: string; isOpen: boolean; booking: { clientName: string; service: string; bookingId: string } | null };

export default function BarberPanel({ tenant }: { tenant: Tenant }) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [myBarber, setMyBarber] = useState<Barber | null>(null);
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<SlotRow[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  // depois de logado, descobre qual barbeiro (desta barbearia) é o usuário atual
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("barbers")
        .select("id, display_name, role_label, photo_url")
        .eq("barbershop_id", tenant.id)
        .eq("profile_id", user.id)
        .maybeSingle();
      setMyBarber(data as Barber | null);
    })();
  }, [user]);

  async function loadAgenda() {
    if (!myBarber) return;
    const date = todayISO();

    const { data: slots } = await supabase
      .from("availability_slots")
      .select("slot_time, is_open")
      .eq("barber_id", myBarber.id)
      .eq("slot_date", date);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, slot_time, status, service_id, client_id, profiles(full_name)")
      .eq("barber_id", myBarber.id)
      .eq("slot_date", date)
      .eq("status", "confirmed");

    const serviceNameById: Record<string, string> = {};
    tenant.services.forEach((s) => (serviceNameById[s.id] = s.name));

    const allTimes = Array.from(new Set([...DEFAULT_SLOTS, ...(slots?.map((s) => s.slot_time) ?? [])])).sort();

    const built: SlotRow[] = allTimes.map((t) => {
      const slot = slots?.find((s) => s.slot_time === t);
      const booking = bookings?.find((b) => b.slot_time === t);
      return {
        time: t,
        isOpen: slot?.is_open ?? false,
        booking: booking
          ? {
              bookingId: booking.id,
              clientName: (booking as any).profiles?.full_name ?? "Cliente",
              service: serviceNameById[booking.service_id] ?? "Serviço",
            }
          : null,
      };
    });

    setRows(built);
  }

  useEffect(() => {
    loadAgenda();
  }, [myBarber]);

  async function toggleSlot(time: string, open: boolean) {
    if (!myBarber) return;
    await supabase
      .from("availability_slots")
      .upsert(
        { barber_id: myBarber.id, slot_date: todayISO(), slot_time: time, is_open: open },
        { onConflict: "barber_id,slot_date,slot_time" }
      );
    loadAgenda();
  }

  async function cancelBooking(bookingId: string) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    loadAgenda();
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMyBarber(null);
  }

  if (checking) return <div className="p-10 text-center text-ink/50 font-mono text-sm">Carregando…</div>;

  if (!user) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center">
        <p className="mb-5 text-sm text-ink/70">Entre com a conta Google cadastrada como barbeiro para ver sua agenda.</p>
        <button onClick={signInWithGoogle} className="px-6 py-3 rounded bg-accent text-white text-xs uppercase font-semibold">
          Entrar com Google
        </button>
      </div>
    );
  }

  if (!myBarber) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center text-sm text-ink/70">
        <p>
          A conta <strong>{user.email}</strong> ainda não está associada a nenhum barbeiro de {tenant.name}. Peça para o
          administrador vincular esse login na tabela <code className="font-mono text-xs">barbers</code>.
        </p>
        <button onClick={signOut} className="mt-6 px-5 py-2.5 rounded border border-ink/20 text-xs uppercase font-semibold">
          Sair e entrar com outra conta
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Agenda — {myBarber.display_name}</h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-ink text-cream px-3 py-1.5 rounded-full">{todayLabel()}</span>
          <button onClick={signOut} className="font-mono text-[10px] uppercase text-ink/50 border border-ink/15 px-3 py-1.5 rounded-full hover:bg-ink/5">
            Sair ({user.email})
          </button>
        </div>
      </div>

      <div className="bg-white border border-ink/10 rounded">
        {rows.map((r) => (
          <div key={r.time} className="flex items-center gap-4 border-b border-ink/10 last:border-none px-4 py-3">
            <div className="font-mono text-sm w-14 text-ink/60">{r.time}</div>
            <div className="flex-1">
              {r.booking ? (
                <span className="inline-block bg-navy text-white text-xs px-3 py-1.5 rounded">
                  Cliente: {r.booking.clientName} — {r.time}
                  <span className="block font-mono text-[10px] opacity-75">{r.booking.service}</span>
                </span>
              ) : r.isOpen ? (
                <span className="text-[#3a7a4a] font-mono text-xs">● Livre</span>
              ) : (
                <span className="text-ink/40 font-mono text-xs">— Fechado</span>
              )}
            </div>
            {r.booking ? (
              <button onClick={() => cancelBooking(r.booking!.bookingId)} className="text-xs font-mono px-3 py-1.5 border border-ink/15 rounded">
                Cancelar
              </button>
            ) : (
              <button
                onClick={() => toggleSlot(r.time, !r.isOpen)}
                className={`text-xs font-mono px-3 py-1.5 border rounded ${r.isOpen ? "border-accent text-accent" : "border-ink/15"}`}
              >
                {r.isOpen ? "Fechar" : "Abrir"}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/50 mt-4">
        Toque em "Fechar" pra tirar um horário livre da agenda, ou "Abrir" pra liberar de novo. Reservas de clientes aparecem
        aqui automaticamente.
      </p>
    </div>
  );
}
