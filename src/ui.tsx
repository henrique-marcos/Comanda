import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { KITCHEN } from "./config";
import { useTheme } from "./hooks";
import { eur, LABEL } from "./lib";
import type { Order } from "./types";

export function Chip({ o }: { o: Order }) {
  if (!KITCHEN) {
    return (
      <>
        {o.estado === "cancelado" ? (
          <span className="chip s-cancelado">Cancelado</span>
        ) : (
          <span className={`chip ${o.lancado ? "s-pronto" : "s-novo"}`}>{o.lancado ? "Lançado" : "Enviado ao caixa"}</span>
        )}
        {o.pago && <span className="chip s-pago">Pago</span>}
      </>
    );
  }
  return (
    <>
      <span className={`chip s-${o.estado}`}>{LABEL[o.estado]}</span>
      {o.lancado && <span className="chip s-pronto">Lançado</span>}
      {o.pago && <span className="chip s-pago">Pago</span>}
    </>
  );
}

export function Fold(p: {
  title: string; count: number; extra?: string; open: boolean;
  onToggle: () => void; children: ReactNode; cls?: string;
}) {
  return (
    <section className={p.cls ?? "cancs"}>
      <h2>
        <button className="ch" aria-expanded={p.open} onClick={p.onToggle}>
          <span className="chv">{p.open ? "▾" : "▸"}</span>
          {p.title} <span className="cn">{p.count}</span>
          {p.extra && <span className="tp">{p.extra}</span>}
        </button>
      </h2>
      {p.open && p.children}
    </section>
  );
}

type Pending = { msg: string; ok: string; fn: () => void };

// Caixa de confirmação: const [ask, dialogNode] = useConfirm(); ask("Texto?", "Botão", () => ...)
export function useConfirm() {
  const [c, setC] = useState<Pending | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (c && !d.open) d.showModal();
    if (!c && d.open) d.close();
  }, [c]);
  const node = (
    <dialog ref={ref} onClose={() => setC(null)}>
      <p>{c?.msg}</p>
      <div className="row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <button className="ghost" onClick={() => setC(null)}>Voltar</button>
        <button className="bad" onClick={() => { const f = c?.fn; setC(null); f?.(); }}>{c?.ok}</button>
      </div>
    </dialog>
  );
  return [(msg: string, ok: string, fn: () => void) => setC({ msg, ok, fn }), node] as const;
}

export function ThemeButton() {
  const [theme, next] = useTheme();
  const name = theme === "auto" ? "automático" : theme === "light" ? "claro" : "escuro";
  return (
    <button className="tb" onClick={next} aria-label="Mudar o tema" title={`Tema: ${name}`}>
      {theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐"}
    </button>
  );
}

// Linha compacta para listas de histórico (pagos, cancelados): detalhes só ao pedir.
export function HistRow({ o, info, actions, cls = "" }: { o: Order; info: string; actions?: ReactNode; cls?: string }) {
  const [open, setOpen] = useState(false);
  const n = o.itens.reduce((s, x) => s + x.q, 0);
  return (
    <div className={`ord hist ${cls}`}>
      <b className="num">#{o.numero}</b>
      <div className="body">
        <span>{n} {n === 1 ? "item" : "itens"}, {eur(o.total)}</span>
        <small>{info}</small>
      </div>
      <div><Chip o={o} /></div>
      <button className="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Ocultar itens" : "Ver itens"}</button>
      {actions}
      {open && (
        <ul className="hdet">
          {o.itens.map((x, i) => <li key={i}><b>{x.q}×</b> {x.n}<small>{eur(x.p * x.q)}</small></li>)}
          {o.observacao && <li className="ob">Obs.: {o.observacao}</li>}
        </ul>
      )}
    </div>
  );
}
