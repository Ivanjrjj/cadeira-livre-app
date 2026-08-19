"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant } from "@/lib/tenant";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function BookingFlow({ tenant }: { tenant: Tenant }) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [freeTimes, setFreeTimes] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [barberFreeCounts, setBarberFreeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(8);

  // sessão atual (se já logado com Google)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // se o usuário estava no meio de um agendamento e precisou logar com Google,
  // a página recarrega do zero — isso recupera a escolha (serviço/barbeiro/horário)
  // salva antes do redirect, pra voltar direto na tela de confirmação.
  useEffect(() => {
    const saved = sessionStorage.getItem(`booking-progress:${tenant.slug}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.serviceId) setServiceId(parsed.serviceId);
      if (parsed.barberId) setBarberId(parsed.barberId);
      if (parsed.time) setTime(parsed.time);
      if (parsed.step) setStep(parsed.step);
    } finally {
      sessionStorage.removeItem(`booking-progress:${tenant.slug}`);
    }
  }, []);

  // depois de confirmar, volta sozinho pro início em alguns segundos
  useEffect(() => {
    if (!confirmed) return;
    setCountdown(8);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          resetClient();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmed]);

  // ao entrar na etapa "escolher barbeiro", busca quantos horários livres cada um tem hoje
  useEffect(() => {
    if (step !== 2) return;
    (async () => {
      const counts: Record<string, number> = {};
      for (const b of tenant.barbers) {
        const res = await fetch(
          `/api/availability?barberId=${b.id}&date=${todayISO()}`
        );
        const json = await res.json();
        counts[b.id] = json.freeTimes?.length ?? 0;
      }
      setBarberFreeCounts(counts);
    })();
  }, [step]);

  // ao escolher o barbeiro, busca os horários livres dele
  useEffect(() => {
    if (step !== 3 || !barberId) return;
    (async () => {
      const res = await fetch(
        `/api/availability?barberId=${barberId}&date=${todayISO()}`
      );
      const json = await res.json();
      setFreeTimes(json.freeTimes ?? []);
    })();
  }, [step, barberId]);

  async function signInWithGoogle() {
    sessionStorage.setItem(
      `booking-progress:${tenant.slug}`,
      JSON.stringify({ serviceId, barberId, time, step: 4 })
    );
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
  }

  async function confirmBooking() {
    setError(null);
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barbershopId: tenant.id,
        barberId,
        serviceId,
        slotDate: todayISO(),
        slotTime: time,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Não foi possível confirmar. Tente outro horário.");
      return;
    }
    setConfirmed(true);
  }

  function resetClient() {
    setStep(1);
    setServiceId(null);
    setBarberId(null);
    setTime(null);
    setError(null);
    setConfirmed(false);
  }

  const selectedBarber = tenant.barbers.find((b) => b.id === barberId);
  const selectedService = tenant.services.find((s) => s.id === serviceId);

  const steps = ["Serviço", "Barbeiro", "Horário", "Confirmar"];

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex border-b-2 border-ink mb-8">
        {steps.map((label, i) => {
          const n = i + 1;
          const isDone = n < step;
          const isCurrent = n === step;
          return (
            <div
              key={label}
              className={`flex-1 text-center py-3 text-xs uppercase tracking-wider font-mono border-b-[3px] -mb-[2px] ${
                isCurrent
                  ? "border-accent text-ink font-bold"
                  : isDone
                  ? "border-transparent text-accent"
                  : "border-transparent text-ink/50"
              }`}
            >
              {n}. {label}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          {tenant.services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`w-full flex justify-between items-center border rounded px-4 py-4 text-left ${
                serviceId === s.id ? "border-accent bg-accent/5" : "border-ink/15 bg-white"
              }`}
            >
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs font-mono text-ink/60">{s.duration_min} min</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 ${
                  serviceId === s.id ? "border-accent bg-accent" : "border-ink/20"
                }`}
              />
            </button>
          ))}
          <div className="flex justify-end pt-4">
            <button
              disabled={!serviceId}
              onClick={() => setStep(2)}
              className="px-6 py-3 text-xs uppercase font-semibold tracking-wide rounded bg-accent text-white disabled:bg-ink/20"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {tenant.barbers.map((b) => {
            const free = barberFreeCounts[b.id] ?? null;
            const disabled = free === 0;
            return (
              <button
                key={b.id}
                disabled={disabled}
                onClick={() => {
                  setBarberId(b.id);
                  setTime(null);
                }}
                className={`w-full flex items-center gap-4 border rounded px-4 py-4 text-left ${
                  barberId === b.id ? "border-navy bg-navy/5" : "border-ink/15 bg-white"
                } ${disabled ? "opacity-40" : ""}`}
              >
                {b.photo_url ? (
                  <img src={b.photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-brass" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-ink/20 flex items-center justify-center font-bold text-lg bg-cream">
                    {b.display_name[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold">{b.display_name}</div>
                  <div className="text-[10px] uppercase tracking-wide text-brass font-mono">{b.role_label}</div>
                  <div className="text-xs text-ink/60 mt-1">
                    {free === null ? "Carregando…" : disabled ? "Sem horários hoje" : `${free} horários livres hoje`}
                  </div>
                </div>
              </button>
            );
          })}
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-6 py-3 text-xs uppercase font-semibold rounded border border-ink/20">
              Voltar
            </button>
            <button
              disabled={!barberId}
              onClick={() => setStep(3)}
              className="px-6 py-3 text-xs uppercase font-semibold tracking-wide rounded bg-accent text-white disabled:bg-ink/20"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="text-sm text-ink/60 mb-3">
            Horários de <strong className="text-ink">{selectedBarber?.display_name}</strong> — hoje
          </div>
          <div className="grid grid-cols-4 gap-2">
            {freeTimes.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`text-center py-3 rounded border font-mono text-sm ${
                  time === t ? "bg-accent border-accent text-white font-bold" : "border-ink/15 bg-white"
                }`}
              >
                {t}
              </button>
            ))}
            {freeTimes.length === 0 && (
              <div className="col-span-4 text-center text-sm text-ink/50 py-6 font-mono">
                Nenhum horário livre agora
              </div>
            )}
          </div>
          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(2)} className="px-6 py-3 text-xs uppercase font-semibold rounded border border-ink/20">
              Voltar
            </button>
            <button
              disabled={!time}
              onClick={() => setStep(4)}
              className="px-6 py-3 text-xs uppercase font-semibold tracking-wide rounded bg-accent text-white disabled:bg-ink/20"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 4 && !confirmed && (
        <div>
          <div className="border-2 border-dashed border-accent rounded p-5 bg-white">
            <Row k="Barbearia" v={tenant.name} />
            <Row k="Serviço" v={selectedService?.name ?? ""} />
            <Row k="Barbeiro" v={selectedBarber?.display_name ?? ""} />
            <Row k="Horário" v={`${todayLabel()}, ${time}`} />
          </div>

          {!user && (
            <button
              onClick={signInWithGoogle}
              className="w-full mt-5 py-3 border border-ink/20 rounded flex items-center justify-center gap-2 text-sm font-medium bg-white"
            >
              Entrar com Google para confirmar
            </button>
          )}

          {user && (
            <p className="text-xs text-ink/50 mt-4 text-center">
              Logado como <strong>{user.email}</strong> ·{" "}
              <button onClick={signOut} className="underline hover:text-ink">
                não é você? trocar de conta
              </button>
            </p>
          )}

          {error && <div className="text-sm text-accent mt-3">{error}</div>}

          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(3)} className="px-6 py-3 text-xs uppercase font-semibold rounded border border-ink/20">
              Voltar
            </button>
            <button
              onClick={confirmBooking}
              className="px-6 py-3 text-xs uppercase font-semibold tracking-wide rounded bg-accent text-white"
            >
              {user ? "Confirmar agendamento" : "Entrar e confirmar"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && confirmed && (
        <div>
          <div className="border-2 border-[#3a7a4a] rounded p-5 bg-white text-center">
            <div className="font-bold text-xl text-[#3a7a4a] mb-3">Vaga garantida</div>
            <Row k="Serviço" v={selectedService?.name ?? ""} />
            <Row k="Barbeiro" v={selectedBarber?.display_name ?? ""} />
            <Row k="Horário" v={`${todayLabel()}, ${time}`} />
          </div>
          <p className="text-xs text-ink/60 mt-4 text-center">
            Chegue com 5 minutos de antecedência. Somente o barbeiro vê seu nome na agenda dele.
          </p>
          <div className="flex flex-col items-center gap-3 mt-6">
            <p className="text-xs font-mono text-ink/50">Voltando ao início em {countdown}s…</p>
            <button
              onClick={resetClient}
              className="px-6 py-3 text-xs uppercase font-semibold tracking-wide rounded border border-ink/20"
            >
              Voltar agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-ink/10 last:border-none text-sm">
      <span className="font-mono text-[11px] uppercase text-ink/50">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
