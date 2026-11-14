import { useState } from "react";
import { supabase } from "../supabase";
import { parsePrice, toast } from "../lib";
import { useConfirm } from "../ui";
import type { MenuItem } from "../types";

export default function Cardapio({ menu }: { menu: MenuItem[] }) {
  const [n, setN] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [ask, dlg] = useConfirm();
  const cats = [...new Set(menu.map((m) => m.categoria))];

  async function add() {
    const preco = parsePrice(p);
    if (!n.trim() || !(preco > 0)) { toast("Indique o nome e o preço"); return; }
    const { error } = await supabase.from("menu_items").insert({ nome: n.trim(), preco, categoria: c.trim() || "Outros" });
    if (error) { toast(error.message); return; }
    setN(""); setP(""); toast("Item adicionado");
  }

  async function upd(m: MenuItem, f: "nome" | "preco" | "categoria", raw: string) {
    const v = raw.trim();
    if (!v) return;
    const val = f === "preco" ? parsePrice(v) : v;
    if (f === "preco" && !((val as number) > 0)) return;
    if (val === m[f]) return;
    const { error } = await supabase.from("menu_items").update({ [f]: val }).eq("id", m.id);
    if (error) toast(error.message);
  }

  const del = (m: MenuItem) =>
    ask(`Remover "${m.nome}" do cardápio?`, "Remover", async () => {
      const { error } = await supabase.from("menu_items").delete().eq("id", m.id);
      if (error) toast(error.message);
    });

  return (
    <>
      <section className="panel">
        <div className="row fr">
          <input placeholder="Nome do item" value={n} onChange={(e) => setN(e.target.value)} />
          <input placeholder="Preço (€)" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
          <input placeholder="Categoria" list="cats" value={c} onChange={(e) => setC(e.target.value)} />
        </div>
        <datalist id="cats">{cats.map((x) => <option key={x} value={x} />)}</datalist>
        <button className="pri" onClick={add}>Adicionar ao cardápio</button>
      </section>

      <h2>Itens (edite diretamente)</h2>
      <div className="list">
        {menu.map((m) => (
          <div className="ord" key={`${m.id}-${m.nome}-${m.preco}-${m.categoria}`}>
            <input className="mf" aria-label="Nome" defaultValue={m.nome} onBlur={(e) => upd(m, "nome", e.target.value)} />
            <input className="mf s" aria-label="Preço" inputMode="decimal" defaultValue={String(m.preco).replace(".", ",")} onBlur={(e) => upd(m, "preco", e.target.value)} />
            <input className="mf s" aria-label="Categoria" defaultValue={m.categoria} onBlur={(e) => upd(m, "categoria", e.target.value)} />
            <button className="ghost" onClick={() => del(m)}>Remover</button>
          </div>
        ))}
      </div>
      {dlg}
    </>
  );
}
