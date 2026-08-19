import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/availability?barberId=...&date=2026-08-16
export async function GET(req: NextRequest) {
  const barberId = req.nextUrl.searchParams.get("barberId");
  const date = req.nextUrl.searchParams.get("date");

  if (!barberId || !date) {
    return NextResponse.json(
      { error: "barberId e date são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();

  const { data: slots, error: slotsError } = await supabase
    .from("availability_slots")
    .select("slot_time")
    .eq("barber_id", barberId)
    .eq("slot_date", date)
    .eq("is_open", true)
    .order("slot_time");

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  const { data: taken, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_time")
    .eq("barber_id", barberId)
    .eq("slot_date", date)
    .eq("status", "confirmed");

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const takenTimes = new Set(taken.map((t) => t.slot_time));
  const freeTimes = slots
    .map((s) => s.slot_time)
    .filter((t) => !takenTimes.has(t));

  return NextResponse.json({ freeTimes });
}
