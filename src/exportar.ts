import { supabase } from "./supabase";
import { POS } from "./config";
import { hm, LABEL, round2 } from "./lib";
import { makeXlsx } from "./xlsx";
import type { Cell } from "./xlsx";
import type { Order } from "./types";

// Vai buscar todos os pedidos do período (o servidor devolve no máximo 1000 de cada vez).
export async function fetchOrders(from: string, to: string): Promise<Order[]> {
  const all: Order[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await supabase
      .from("orders").select("*").gte("dia", from).lte("dia", to)
      .order("dia").order("numero").range(i, i + 999);
    if (error) throw new Error(error.message);
    const page = (data || []) as Order[];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

export function buildWorkbook(orders: Order[], label: string): Uint8Array {
  const ok = orders.filter((o) => o.estado !== "cancelado");
  const sum = (a: Order[]) => round2(a.reduce((s, o) => s + o.total, 0));
  const pagos = ok.filter((o) => o.pago);
  const m = (n: number): Cell => ({ n: round2(n), money: true });
  const sim = (b: boolean) => (b ? "sim" : "não");

  const qtd: Record<string, number> = {};
  ok.forEach((o) => o.itens.forEach((x) => { qtd[x.n] = (qtd[x.n] || 0) + x.q; }));
  const top = Object.entries(qtd).sort((a, b) => b[1] - a[1]);

  const resumo: Cell[][] = [
    ["Período", label],
    ["Pedidos", ok.length],
    ["Total faturado (€)", m(sum(ok))],
    ["Recebido (€)", m(sum(pagos))],
    ["Por cobrar (€)", m(sum(ok) - sum(pagos))],
    ["Pedidos cancelados", orders.length - ok.length],
  ];
  const maisVendidos: Cell[][] = [["Produto", "Quantidade vendida"], ...top.map(([n, q]): Cell[] => [n, q])];
  const pedidos: Cell[][] = [
    ["Data", "Pedido", "Hora", "Itens", "Observação", "Total (€)", `Lançado no ${POS}`, "Pago", "Hora do pagamento", "Estado"],
    ...orders.map((o): Cell[] => [
      o.dia, o.numero, hm(o.criado_em),
      o.itens.map((x) => `${x.q}x ${x.n}`).join(", "),
      o.observacao || "", m(o.total), sim(o.lancado), sim(o.pago),
      o.pago_em ? hm(o.pago_em) : "", LABEL[o.estado],
    ]),
  ];
  const itens: Cell[][] = [
    ["Data", "Pedido", "Produto", "Quantidade", "Preço unitário (€)", "Subtotal (€)", "Item livre"],
    ...ok.flatMap((o) =>
      o.itens.map((x): Cell[] => [o.dia, o.numero, x.n, x.q, m(x.p), m(x.p * x.q), sim(!!x.ex)])
    ),
  ];

  return makeXlsx([
    { name: "Resumo", rows: resumo, widths: [24, 22], header: false, boldCols: [0] },
    { name: "Mais vendidos", rows: maisVendidos, widths: [34, 20] },
    { name: "Pedidos", rows: pedidos, widths: [12, 9, 8, 50, 28, 12, 20, 8, 18, 12] },
    { name: "Itens", rows: itens, widths: [12, 9, 34, 11, 18, 14, 11] },
  ]);
}
