import { useEffect, useState } from "react";
import { setLancado, setPago } from "../api";
import { POS } from "../config";
import { useFolds, useTick } from "../hooks";
import { eur, hm, round2, toast } from "../lib";
import { Chip, Fold, HistRow, useConfirm } from "../ui";
import type { Order } from "../types";

export default function Caixa({ orders }: { orders: Order[] }) {
  useTick(30000);
  const [cx, setCx] = useState("");
  const [cl, tg] = useFolds();
  const [ask, dlg] = useConfirm();

  const byTime = (a: Order, b: Order) => a.criado_em.localeCompare(b.criado_em);
  const porLancar = orders.filter((o) => !o.lancado && o.estado !== "cancelado").sort(byTime);
  const porCobrar = orders.filter((o) => o.lancado && !o.pago && o.estado !== "cancelado");
  const pagos = orders
    .filter((o) => o.pago && o.estado !== "cancelado")
    .sort((a, b) => (b.pago_em || b.criado_em).localeCompare(a.pago_em || a.criado_em));
  const o = cx.trim() ? orders.find((x) => String(x.numero) === cx.trim()) : undefined;

  // Mostra no título do separador quantos pedidos esperam lançamento.
  useEffect(() => {
    document.title = porLancar.length ? `(${porLancar.length}) Comanda` : "Comanda";
    return () => { document.title = "Comanda"; };
  }, [porLancar.length]);

  async function run(p: Promise<void>, ok: string) {
    try { await p; toast(ok); } catch (e) { toast((e as Error).message); }
  }
  const lancar = (x: Order) => run(setLancado(x.id, true), `Pedido #${x.numero} lançado`);
  const pay = (x: Order) => run(setPago(x.id, true).then(() => setCx("")), `Pedido #${x.numero} pago`);
  const unpay = (x: Order) =>
    ask(`Desfazer o pagamento do pedido #${x.numero}?`, "Desfazer pagamento", () =>
      setPago(x.id, false).catch((e) => toast(e.message)));

  const card = (x: Order) => {
    const m = Math.floor((Date.now() - new Date(x.criado_em).getTime()) / 60000);
    return (
      <div key={x.id} className="tk s-novo">
        <span className="th">
          <b className="num">#{x.numero}</b>
          <span className="lb">Por lançar</span>
          <span className={`age${m >= 10 ? " u" : m >= 5 ? " w" : ""}`}>{m < 1 ? "agora" : `${m} min`}</span>
        </span>
        <ul className="il">
          {x.itens.map((i, k) => <li key={k}><b>{i.q}×</b> {i.n}<small>{eur(i.p)}</small></li>)}
        </ul>
        {x.observacao && <span className="ob">Obs.: {x.observacao}</span>}
        <span className="cx-tot"><span>Total</span><b>{eur(x.total)}</b></span>
        <button className="go" onClick={() => lancar(x)}>Lançado no {POS}</button>
      </div>
    );
  };

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Por lançar no {POS} <span className="cn">{porLancar.length}</span></h2>
      <div className="grid">
        {porLancar.map(card)}
        {!porLancar.length && <p className="mut">Nenhum pedido à espera.</p>}
      </div>

      <h2>Pagamento</h2>
      <section className="panel">
        <label>Número do pedido
          <input inputMode="numeric" placeholder="Ex.: 12" value={cx} onChange={(e) => setCx(e.target.value)} />
        </label>
        {o ? (
          o.estado === "cancelado" ? <p className="err">O pedido #{o.numero} foi cancelado.</p>
          : (
            <div className="due">
              <span className="body" style={{ whiteSpace: "pre-line" }}>
                {o.itens.map((x) => `${x.q}× ${x.n}`).join("\n")}
              </span>
              <b className="big">{eur(o.total)}</b>
              <div><Chip o={o} /></div>
              <div className="row fr">
                {!o.lancado && <button className="pri" onClick={() => lancar(o)}>Lançado no {POS}</button>}
                {o.lancado && !o.pago && (
                  <button className="ghost" onClick={() => run(setLancado(o.id, false), "Lançamento desmarcado")}>Desmarcar lançado</button>
                )}
                {o.lancado && !o.pago && <button className="pri" onClick={() => pay(o)}>Confirmar pagamento</button>}
                {!o.lancado && <p className="mut" style={{ margin: 0 }}>Lance o pedido no {POS} antes de registar o pagamento.</p>}
                {o.pago && <p className="okm" style={{ margin: 0 }}>Já está pago.</p>}
              </div>
            </div>
          )
        ) : cx.trim() ? <p className="err">Não existe o pedido #{cx.trim()} hoje.</p> : null}
      </section>

      <h2>A aguardar pagamento</h2>
      <div className="chips">
        {porCobrar.map((x) => (
          <button key={x.id} className="pick" onClick={() => setCx(String(x.numero))}>#{x.numero} – {eur(x.total)}</button>
        ))}
        {!porCobrar.length && <p className="mut">Nada por cobrar.</p>}
      </div>

      <Fold title="Pagos" count={pagos.length} extra={eur(round2(pagos.reduce((s, x) => s + x.total, 0)))}
        open={!cl.cp} onToggle={() => tg("cp")}>
        <div className="list">
          {pagos.map((x) => (
            <HistRow key={x.id} o={x} info={x.pago_em ? `pago às ${hm(x.pago_em)}` : "pago"}
              actions={<button className="ghost" onClick={() => unpay(x)}>Desfazer</button>} />
          ))}
          {!pagos.length && <p className="mut">Ainda sem pagamentos hoje.</p>}
        </div>
      </Fold>
      {dlg}
    </>
  );
}
