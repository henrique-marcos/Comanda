import { useEffect, useState } from "react";
import { saveSetting } from "../api";
import { buildWorkbook, fetchOrders } from "../exportar";
import { useSetting } from "../hooks";
import { eur, round2, today, toast } from "../lib";
import { supabase } from "../supabase";
import { saveXlsx } from "../xlsx";
import LineChart from "./LineChart";

type Period = "dia" | "mes" | "ano";
type Row = { bucket: string; pedidos: number; total: number; recebido: number; cancelados: number };
type Top = { nome: string; qtd: number };

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PERIOD_LABEL: Record<Period, string> = { dia: "Dia", mes: "Mês", ano: "Ano" };
const pad = (n: number) => String(n).padStart(2, "0");

function rangeOf(p: Period, dia: string, mes: string, ano: number) {
  if (p === "dia") return { from: dia, to: dia, group: "hora", key: dia };
  if (p === "mes") {
    const [y, m] = mes.split("-").map(Number);
    return { from: `${mes}-01`, to: `${mes}-${pad(new Date(y, m, 0).getDate())}`, group: "dia", key: mes };
  }
  return { from: `${ano}-01-01`, to: `${ano}-12-31`, group: "mes", key: String(ano) };
}

export default function Resumo() {
  const t = today();
  const [period, setPeriod] = useState<Period>("dia");
  const [dia, setDia] = useState(t);
  const [mes, setMes] = useState(t.slice(0, 7));
  const [ano, setAno] = useState(Number(t.slice(0, 4)));
  const [metric, setMetric] = useState<"valor" | "pedidos">("valor");
  const [rows, setRows] = useState<Row[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = useSetting("review_url");
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(saved), [saved]);

  const r = rangeOf(period, dia, mes, ano);

  useEffect(() => {
    let off = false;
    const load = async () => {
      const a = await supabase.rpc("resumo", { p_inicio: r.from, p_fim: r.to, p_agrupar: r.group });
      const b = await supabase.rpc("mais_vendidos", { p_inicio: r.from, p_fim: r.to });
      if (off) return;
      if (a.error) { setErr(a.error.message); return; }
      setErr("");
      setRows(((a.data || []) as Row[]).map((x) => ({
        bucket: x.bucket, pedidos: Number(x.pedidos), total: Number(x.total),
        recebido: Number(x.recebido), cancelados: Number(x.cancelados),
      })));
      setTop(((b.data || []) as Top[]).map((x) => ({ nome: x.nome, qtd: Number(x.qtd) })));
    };
    load();
    const iv = window.setInterval(load, 30000);
    return () => { off = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.from, r.to, r.group]);

  // Preenche os períodos sem vendas com zero.
  let keys: string[] = [];
  let labels: string[] = [];
  if (period === "dia") {
    keys = Array.from({ length: 24 }, (_, h) => pad(h));
    labels = keys.map((k) => `${k}h`);
  } else if (period === "mes") {
    const n = Number(r.to.slice(8));
    keys = Array.from({ length: n }, (_, i) => `${r.key}-${pad(i + 1)}`);
    labels = keys.map((_, i) => String(i + 1));
  } else {
    keys = Array.from({ length: 12 }, (_, i) => `${r.key}-${pad(i + 1)}`);
    labels = MONTHS;
  }
  const byKey = new Map(rows.map((x) => [x.bucket, x]));
  const values = keys.map((k) => {
    const x = byKey.get(k);
    return x ? (metric === "valor" ? x.recebido : x.pedidos) : 0;
  });

  const sum = (f: (x: Row) => number) => rows.reduce((s, x) => s + f(x), 0);
  const pedidos = sum((x) => x.pedidos);
  const total = round2(sum((x) => x.total));
  const recebido = round2(sum((x) => x.recebido));
  const cancelados = sum((x) => x.cancelados);

  async function exportar() {
    setBusy(true);
    try {
      const orders = await fetchOrders(r.from, r.to);
      saveXlsx(buildWorkbook(orders, r.key), `pedidos-${r.key}.xlsx`);
      toast("Planilha criada");
    } catch (e) {
      toast("Não foi possível criar a planilha: " + (e as Error).message);
    }
    setBusy(false);
  }
  const saveUrl = () => saveSetting("review_url", url.trim()).then(() => toast("Link guardado"), (e) => toast(e.message));
  const years = Array.from({ length: 6 }, (_, i) => Number(t.slice(0, 4)) - i);

  return (
    <>
      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="seg">
          {(["dia", "mes", "ano"] as Period[]).map((p) => (
            <button key={p} className={`pick${p === period ? " on" : ""}`} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</button>
          ))}
        </div>
        {period === "dia" && (
          <label>Dia
            <input type="date" value={dia} max={t} onChange={(e) => e.target.value && setDia(e.target.value)} />
          </label>
        )}
        {period === "mes" && (
          <label>Mês
            <input type="month" value={mes} max={t.slice(0, 7)} onChange={(e) => e.target.value && setMes(e.target.value)} />
          </label>
        )}
        {period === "ano" && (
          <label>Ano
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}
      </section>

      {err && <p className="err">Não foi possível carregar os dados: {err}. Já executou o ficheiro supabase/migracao-2.sql?</p>}

      <div className="kpis">
        <div><b>{pedidos}</b>pedidos</div>
        <div><b>{eur(recebido)}</b>valor bruto recebido</div>
        <div><b>{eur(round2(total - recebido))}</b>por cobrar</div>
        <div><b>{cancelados}</b>cancelados</div>
      </div>

      <section className="panel">
        <div className="seg">
          <button className={`pick${metric === "valor" ? " on" : ""}`} onClick={() => setMetric("valor")}>Valor recebido</button>
          <button className={`pick${metric === "pedidos" ? " on" : ""}`} onClick={() => setMetric("pedidos")}>Pedidos</button>
        </div>
        <LineChart labels={labels} values={values} fmt={(n) => (metric === "valor" ? eur(n) : `${n} pedidos`)} />
      </section>

      <h2>Mais vendidos</h2>
      <div className="list">
        {top.map((x) => <div className="ord" key={x.nome}><span className="body">{x.nome}</span><b>{x.qtd}</b></div>)}
        {!top.length && <p className="mut">Ainda sem vendas neste período.</p>}
      </div>

      <h2>Planilha</h2>
      <section className="panel">
        <p className="mut" style={{ margin: 0 }}>
          Cria um ficheiro Excel (.xlsx) com o resumo, os mais vendidos, os pedidos e os itens vendidos de {r.key}.
        </p>
        <button className="pri" disabled={busy} onClick={exportar}>{busy ? "A criar…" : "Criar planilha"}</button>
      </section>

      <h2>Google Review</h2>
      <section className="panel">
        <label>Link de avaliação (gera o QR code do botão Avaliar)
          <input value={url} placeholder="https://g.page/r/..." onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button className="pri" onClick={saveUrl}>Guardar link</button>
      </section>
    </>
  );
}
