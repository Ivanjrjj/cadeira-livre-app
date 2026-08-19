"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant } from "@/lib/tenant";

type MyBooking = {
  id: string;
  slot_date: string;
  slot_time: string;
  status: string;
  service_id: string;
  barber_id: string;
};

export default function MyBookings({ tenant }: { tenant: Tenant }) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  async function loadBookings() {
    if (!user) return;
    setLoadingList(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, slot_date, slot_time, status, service_id, barber_id")
      .eq("barbershop_id", tenant.id)
      .eq("client_id", user.id)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });
    setBookings((data as MyBooking[]) ?? []);
    setLoadingList(false);
  }

  useEffect(() => {
    loadBookings();
  }, [user]);

  async function cancelBooking(id: string) {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      alert("Não foi possível cancelar: " + error.message);
      return;
    }
    loadBookings();
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  }

  const serviceName = (id: string) => tenant.services.find((s) => s.id === id)?.name ?? "Serviço";
  const barberName = (id: string) => tenant.barbers.find((b) => b.id === id)?.display_name ?? "Barbeiro";

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.slot_date >= todayISO);
  const past = bookings.filter((b) => b.status !== "confirmed" || b.slot_date < todayISO);

  if (checking) return <div className="p-10 text-center text-ink/50 font-mono text-sm">Carregando…</div>;

  if (!user) {
    return (
      <div className="max-w-sm mx-auto py-20 text-center">
        <p className="mb-5 text-sm text-ink/70">Entre com sua conta Google para ver seus agendamentos.</p>
        <button onClick={signInWithGoogle} className="px-6 py-3 rounded bg-accent text-white text-xs uppercase font-semibold">
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Meus agendamentos</h2>
        <span className="text-xs font-mono text-ink/50">{user.email}</span>
      </div>

      {loadingList && <div className="text-sm text-ink/50 font-mono">Carregando…</div>}

      {!loadingList && upcoming.length === 0 && (
        <div className="text-sm text-ink/50 font-mono text-center py-10">Nenhum agendamento futuro.</div>
      )}

      <div className="space-y-3">
        {upcoming.map((b) => (
          <div key={b.id} className="flex items-center justify-between border border-ink/10 rounded p-4 bg-white">
            <div>
              <div className="font-semibold text-sm">{serviceName(b.service_id)}</div>
              <div className="text-xs text-ink/60 mt-1">
                com {barberName(b.barber_id)} — {b.slot_date.split("-").reverse().join("/")} às {b.slot_time.slice(0, 5)}
              </div>
            </div>
            <button
              onClick={() => cancelBooking(b.id)}
              className="text-xs font-mono px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/5"
            >
              Cancelar
            </button>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xs font-mono uppercase text-ink/40 mb-3">Anteriores / cancelados</h3>
          <div className="space-y-2">
            {past.map((b) => (
              <div key={b.id} className="flex items-center justify-between border border-ink/10 rounded p-3 bg-white opacity-60">
                <div className="text-xs">
                  {serviceName(b.service_id)} — {b.slot_date.split("-").reverse().join("/")} às {b.slot_time.slice(0, 5)}
                </div>
                <span className="text-[10px] font-mono uppercase text-ink/40">
                  {b.status === "cancelled" ? "cancelado" : "passado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
