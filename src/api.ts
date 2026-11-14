import { supabase } from "./supabase";
import type { Estado, Line } from "./types";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// O servidor recalcula os preços a partir do cardápio e numera o pedido.
export async function createOrder(lines: Line[], obs: string): Promise<number> {
  const itens = lines.map(({ id, n, p, q, ex }) => ({ id, n, p, q, ex: !!ex }));
  const { data, error } = await supabase
    .from("orders")
    .insert({ itens, observacao: obs.trim() || null })
    .select("numero")
    .single();
  check(error);
  return data!.numero as number;
}

export async function setEstado(id: number, estado: Estado) {
  const { error } = await supabase.from("orders").update({ estado }).eq("id", id);
  check(error);
}

export async function setPago(id: number, pago: boolean) {
  const { error } = await supabase.from("orders").update({ pago }).eq("id", id);
  check(error);
}

export async function setLancado(id: number, lancado: boolean) {
  const { error } = await supabase.from("orders").update({ lancado }).eq("id", id);
  check(error);
}

export async function saveSetting(key: string, value: string) {
  const { error } = await supabase.from("settings").upsert({ key, value });
  check(error);
}
