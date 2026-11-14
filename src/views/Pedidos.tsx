import { useState } from "react";
import { createOrder, setEstado } from "../api";
import { KITCHEN } from "../config";
import { useFolds } from "../hooks";
import { eur, hm, mt, nz, parsePrice, round2, toast } from "../lib";
import { Chip, Fold, HistRow, useConfirm } from "../ui";
import type { Line, MenuItem, Order } from "../types";

export default function Pedidos({ orders, menu }: { orders: Order[]; menu: MenuItem[] }) {
  const [cart, setCart] = useState<Line[]>([]);
  const [obs, setObs] = useState("");
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("");
  const [fn, setFn] = useState("");
  const [fp, setFp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cl, tg] = useFolds();
  const [ask, dlg] = useConfirm();

  const cats = [...new Set(menu.map((m) => m.categoria))];
  const sv = nz(q.trim());
  const show = !!sv || !!flt;
  const items = show
    ? menu.filter((m) => (!flt || flt === "Todos" || !cats.includes(flt) || m.categoria === flt) && mt(m.nome, sv))
    : [];
  const total = round2(cart.reduce((s, x) => s + x.p * x.q, 0));
  const n = cart.reduce((s, x) => s + x.q, 0);
  const qty = (id: number) => cart.find((x) => x.id === id && !x.ex)?.q || 0;

  const add = (m: MenuItem) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.id === m.id && !x.ex);
      if (i < 0) return [...c, { id: m.id, n: m.nome, p: m.preco, q: 1 }];
      return c.map((x, j) => (j === i ? { ...x, q: x.q + 1 } : x));
    });
  const chg = (i: number, d: number) =>
    setCart((c) => c.map((x, j) => (j === i ? { ...x, q: x.q + d } : x)).filter((x) => x.q > 0));
  const addFree = () => {
    const p = parsePrice(fp);
    if (!fn.trim() || !(p > 0)) { toast("Indique o nome e o preço do item livre"); return; }
    setCart((c) => [...c, { n: fn.trim(), p, q: 1, ex: true }]);
    setFn(""); setFp("");
  };

  async function send() {
    if (!cart.length) { setErr("Adicione pelo menos um item."); return; }
    setErr(""); setBusy(true);
    try {
      const num = await createOrder(cart, obs);
      setCart([]); setObs("");
      toast(`Pedido #${num} enviado`);
    } catch (e) {
      setErr("Não foi possível enviar: " + (e as Error).message);
    }
    setBusy(false);
  }

  const concluido = (o: Order) => o.pago && (KITCHEN ? o.estado === "pronto" : o.lancado);
  const active = orders.filter((o) => o.estado !== "cancelado" && !concluido(o)).reverse();
  const canc = orders.filter((o) => o.estado === "cancelado").reverse();
  const cancel = (o: Order) =>
    ask(`Cancelar o pedido #${o.numero}?`, "Cancelar pedido", () =>
      setEstado(o.id, "cancelado").catch((e) => toast(e.message)));

  return (
    <>
      <div className="ped">
        <div className="menu">
          <input id="sq" type="search" placeholder="Pesquisar produto" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="fl">
            {["Todos", ...cats].map((c) => (
              <button key={c} className={`pick${c === flt ? " on" : ""}`} onClick={() => setFlt((f) => (f === c ? "" : c))}>{c}</button>
            ))}
          </div>
          {show && <p className="mut cnt">{items.length} {items.length === 1 ? "produto" : "produtos"}</p>}
          <div className="mg">
            {items.map((m) => (
              <button key={m.id} className="mi" onClick={() => add(m)}>
                <span>{m.nome}</span><b>{eur(m.preco)}</b>
                {qty(m.id) > 0 && <i className="bd">{qty(m.id)}</i>}
              </button>
            ))}
            {!items.length && <p className="mut">{show ? "Nenhum produto encontrado." : "Pesquise um produto ou escolha uma categoria."}</p>}
          </div>
          <h2>Item livre</h2>
          <div className="row fr">
            <input placeholder="Nome" value={fn} onChange={(e) => setFn(e.target.value)} />
            <input placeholder="Preço (€)" inputMode="decimal" value={fp} onChange={(e) => setFp(e.target.value)} />
            <button className="ghost" onClick={addFree}>Adicionar</button>
          </div>
        </div>

        <section className="panel cart" id="cartp">
          <b>Pedido atual</b>
          {cart.map((x, i) => (
            <div className="ln" key={i}>
              <span>{x.n}{x.ex && <> <em className="chip s-novo">livre</em></>}</span>
              <span className="qt">
                <button className="ghost" aria-label="Menos" onClick={() => chg(i, -1)}>−</button>
                <b>{x.q}</b>
                <button className="ghost" aria-label="Mais" onClick={() => chg(i, 1)}>+</button>
              </span>
              <span className="lt">{eur(x.p * x.q)}</span>
            </div>
          ))}
          {!cart.length && <p className="mut">Toque nos itens do cardápio para adicionar.</p>}
          <label>Observações
            <input placeholder="Ex.: sem cebola" value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
          <div className="tot"><span>Total</span><b className="big">{eur(total)}</b></div>
          <p className="err">{err}</p>
          <button className="pri" disabled={busy} onClick={send}>{KITCHEN ? "Enviar para a cozinha" : "Enviar para o caixa"}</button>
        </section>

        {cart.length > 0 && (
          <button className="bar" onClick={() => document.getElementById("cartp")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            <span>{n} {n > 1 ? "itens" : "item"}</span><b>{eur(total)}</b><span>Ver pedido</span>
          </button>
        )}
      </div>

      <h2>Hoje</h2>
      <div className="list">
        {active.map((o) => (
          <div className="ord" key={o.id}>
            <b className="num">#{o.numero}</b>
            <div className="body">
              {o.itens.map((x) => `${x.q}× ${x.n}`).join("\n")}
              {o.observacao ? `\nObs.: ${o.observacao}` : ""}
              <small>{hm(o.criado_em)}, {eur(o.total)}</small>
            </div>
            <div>
              <Chip o={o} />
              {o.itens.some((x) => x.ex) && <span className="chip s-novo">Item livre</span>}
            </div>
            {!o.pago && !o.lancado && <button className="ghost" onClick={() => cancel(o)}>Cancelar</button>}
          </div>
        ))}
        {!active.length && <p className="mut">Sem pedidos ativos.</p>}
      </div>

      {canc.length > 0 && (
        <Fold title="Cancelados" count={canc.length} open={!!cl.co} onToggle={() => tg("co")}>
          <div className="list">
            {canc.map((o) => (
              <HistRow key={o.id} o={o} cls="canc" info={o.cancelado_em ? `cancelado às ${hm(o.cancelado_em)}` : "cancelado"} />
            ))}
          </div>
        </Fold>
      )}
      {dlg}
    </>
  );
}
