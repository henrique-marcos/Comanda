import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { today } from "./lib";
import type { MenuItem, Order } from "./types";

// Carrega dados e recarrega quando a tabela muda (tempo real), ao voltar a ter
// internet, ao voltar ao separador e a cada 30 s (rede de segurança).
function useLive<T>(table: string, fetcher: () => Promise<T>, init: T, deps: unknown[]): T {
  const [data, setData] = useState<T>(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => { fetcher().then(setData).catch(() => {}); }, deps);
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, load)
      .subscribe();
    const iv = window.setInterval(load, 30000);
    const vis = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("online", load);
    document.addEventListener("visibilitychange", vis);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(iv);
      window.removeEventListener("online", load);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load, table]);
  return data;
}

export const useOrders = (dia: string) =>
  useLive<Order[]>(
    "orders",
    async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("dia", dia).order("numero");
      if (error) throw error;
      return (data || []) as Order[];
    },
    [],
    [dia]
  );

export const useMenu = () =>
  useLive<MenuItem[]>(
    "menu_items",
    async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("categoria").order("nome");
      if (error) throw error;
      return (data || []) as MenuItem[];
    },
    [],
    []
  );

export const useSetting = (key: string) =>
  useLive<string>(
    "settings",
    async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      return ((data as { value: string } | null)?.value) || "";
    },
    "",
    [key]
  );

// Data de hoje (muda sozinha à meia-noite).
export function useDay() {
  const [d, setD] = useState(today());
  useEffect(() => {
    const i = window.setInterval(() => setD(today()), 60000);
    return () => clearInterval(i);
  }, []);
  return d;
}

export function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

export function useOnline() {
  const [on, set] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => set(true), b = () => set(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}

// Secções minimizáveis, lembradas neste aparelho.
export function useFolds() {
  const [cl, set] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("comanda_cl") || "{}"); } catch { return {}; }
  });
  const tg = (k: string) =>
    set((p) => {
      const n = { ...p, [k]: !p[k] };
      try { localStorage.setItem("comanda_cl", JSON.stringify(n)); } catch { /* ignora */ }
      return n;
    });
  return [cl, tg] as const;
}

// Tema: automático (segue o sistema), claro ou escuro. Lembrado neste aparelho.
export type Theme = "auto" | "light" | "dark";
export function useTheme() {
  const [t, set] = useState<Theme>(() => {
    try { return (localStorage.getItem("comanda_theme") as Theme) || "auto"; } catch { return "auto"; }
  });
  useEffect(() => {
    const r = document.documentElement;
    if (t === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", t);
    try { localStorage.setItem("comanda_theme", t); } catch { /* ignora */ }
  }, [t]);
  const next = () => set((x) => (x === "auto" ? "light" : x === "light" ? "dark" : "auto"));
  return [t, next] as const;
}
