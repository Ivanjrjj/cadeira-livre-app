import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// POST /api/bookings
// body: { barbershopId, barberId, serviceId, slotDate, slotTime }
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para agendar" }, { status: 401 });
  }

  const body = await req.json();
  const { barbershopId, barberId, serviceId, slotDate, slotTime } = body;

  if (!barbershopId || !barberId || !serviceId || !slotDate || !slotTime) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // A constraint UNIQUE (barber_id, slot_date, slot_time) na tabela `bookings`
  // é o que garante, no banco, que dois clientes nunca ocupem o mesmo horário
  // mesmo se clicarem "confirmar" ao mesmo tempo — o segundo insert falha aqui.
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      barbershop_id: barbershopId,
      barber_id: barberId,
      service_id: serviceId,
      client_id: user.id,
      slot_date: slotDate,
      slot_time: slotTime,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // violação da constraint unique = alguém já pegou esse horário
      return NextResponse.json(
        { error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
