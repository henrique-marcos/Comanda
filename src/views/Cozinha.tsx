import { useState } from "react";
import type { CSSProperties } from "react";
import { setEstado } from "../api";
import { useFolds, useTick } from "../hooks";
import { hm, LABEL, toast } from "../lib";
import { Fold } from "../ui";
import type { Estado, Order } from "../types";

export default function Cozinha({ orders }: { orders: Order[] }) {
  useTick(30000); // atualiza os tempos de espera
  const [cl, tg] = useFolds();
  const [undo, setUndo] = useState<{ id: number; numero: number; from: Estado } | null>(null);

  const byTime = (a: Order, b: Order) => a.criado_em.localeCompare(b.criado_em);
  const novos = orders.filter((o) => o.estado === "novo").sort(byTime);
  const prep = orders.filter((o) => o.estado === "preparo").sort(byTime);
  const prontos = orders
    .filter((o) => o.estado === "pronto")
    .sort((a, b) => (b.pronto_em || b.criado_em).localeCompare(a.pronto_em || a.criado_em));

  async function go(o: Order, to: Estado) {
    try {
      await setEstado(o.id, to);
      setUndo({ id: o.id, numero: o.numero, from: o.estado });
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function back() {
    if (!undo) return;
    const u = undo;
    setUndo(null);
    try { await setEstado(u.id, u.from); } catch (e) { toast((e as Error).message); }
  }

  const card = (o: Order) => {
    const m = Math.floor((Date.now() - new Date(o.criado_em).getTime()) / 60000);
    return (
      <button key={o.id} className={`tk s-${o.estado}`} onClick={() => go(o, o.estado === "novo" ? "preparo" : "pronto")}>
        <span className="th">
          <b className="num">#{o.numero}</b>
          <span className="lb">{LABEL[o.estado]}</span>
          <span className={`age${m >= 20 ? " u" : m >= 10 ? " w" : ""}`}>{m < 1 ? "agora" : `${m} min`}</span>
        </span>
        <ul className="il">
          {o.itens.map((x, i) => <li key={i}><b>{x.q}×</b> {x.n}</li>)}
        </ul>
        {o.observacao && <span className="ob">Obs.: {o.observacao}</span>}
        <span className="go">{o.estado === "novo" ? "Iniciar preparo" : "Marcar como pronto"}</span>
      </button>
    );
  };

  const cols = ["n", "p", "r"].map((k) => (cl[k] ? "auto" : "minmax(0,1fr)")).join(" ");

  return (
    <>
      {undo && <button className="undo" onClick={back}>Desfazer último toque (#{undo.numero})</button>}
      <div className="kb" style={{ "--cols": cols } as CSSProperties}>
        <Fold cls="" title="Novos" count={novos.length} open={!cl.n} onToggle={() => tg("n")}>
          <div className="grid">{novos.map(card)}{!novos.length && <p className="mut">Nenhum pedido novo.</p>}</div>
        </Fold>
        <Fold cls="" title="Em preparo" count={prep.length} open={!cl.p} onToggle={() => tg("p")}>
          <div className="grid">{prep.map(card)}{!prep.length && <p className="mut">Nada em preparo.</p>}</div>
        </Fold>
        <Fold cls="" title="Prontos" count={prontos.length} open={!cl.r} onToggle={() => tg("r")}>
          <div className="pl">
            {prontos.map((o) => (
              <div className="ord rd" key={o.id}>
                <b className="num">#{o.numero}</b>
                <span className="body">{o.itens.map((x) => `${x.q}× ${x.n}`).join(", ")}</span>
                <small>{hm(o.pronto_em || o.criado_em)}</small>
                <button className="ghost" onClick={() => go(o, "preparo")}>Reabrir</button>
              </div>
            ))}
            {!prontos.length && <p className="mut">Nenhum pedido pronto.</p>}
          </div>
        </Fold>
      </div>
    </>
  );
}
