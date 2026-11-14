import type { Estado } from "./types";

// Fuso horário do restaurante. Se mudar aqui, mude também no supabase/schema.sql.
export const TZ = "Europe/Lisbon";

export const eur = (v: number) =>
  Number(v).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
export const hm = (t: string | number) =>
  new Date(t).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const parsePrice = (s: string) => parseFloat(s.replace(",", "."));

// Pesquisa sem acentos e sem diferenciar maiúsculas.
export const nz = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Uma letra: nomes que começam com ela. Duas ou mais: também início de qualquer palavra.
export const mt = (name: string, q: string) => {
  const x = nz(name);
  return !q || x.startsWith(q) || (q.length > 1 && (" " + x).includes(" " + q));
};

export const LABEL: Record<Estado, string> = {
  novo: "Novo",
  preparo: "Em preparo",
  pronto: "Pronto",
  cancelado: "Cancelado",
};

let timer: number | undefined;
export function toast(m: string) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(timer);
  timer = window.setTimeout(() => t.classList.remove("on"), 2600);
}
