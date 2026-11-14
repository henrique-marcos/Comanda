import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";
import { configured, supabase } from "./supabase";
import { KITCHEN } from "./config";
import { useDay, useMenu, useOnline, useOrders, useSetting } from "./hooks";
import type { Role } from "./types";
import { ThemeButton } from "./ui";
import Login from "./views/Login";
import Pedidos from "./views/Pedidos";
import Cozinha from "./views/Cozinha";
import Caixa from "./views/Caixa";
import Resumo from "./views/Resumo";
import Cardapio from "./views/Cardapio";

type Profile = { papel: Role; nome: string };

const ROLE_LABEL: Record<Role, string> = { pedidos: "Pedidos", cozinha: "Cozinha", caixa: "Caixa", admin: "Admin" };
const TAB_LABEL: Record<string, string> = {
  pedidos: "Pedidos", cozinha: "Cozinha", caixa: "Caixa", resumo: "Resumo", cardapio: "Cardápio",
};

export default function App() {
  if (!configured) {
    return (
      <main>
        <section className="panel">
          <b>Falta configurar o Supabase</b>
          <p className="mut">
            Copie o ficheiro .env.example para .env, preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
            e reinicie o <code>npm run dev</code>.
          </p>
        </section>
      </main>
    );
  }
  return <Gate />;
}

function Gate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <main><p className="mut">A carregar…</p></main>;
  if (!session) return <Login />;
  return <Shell uid={session.user.id} email={session.user.email || ""} />;
}

function Shell({ uid, email }: { uid: string; email: string }) {
  const [prof, setProf] = useState<Profile | null | undefined>(undefined);
  useEffect(() => {
    supabase.from("profiles").select("papel,nome").eq("id", uid).maybeSingle()
      .then(({ data }) => setProf((data as Profile | null) || null));
  }, [uid]);
  if (prof === undefined) return <main><p className="mut">A carregar…</p></main>;
  if (!prof) {
    return (
      <main>
        <div className="theme-corner"><ThemeButton /></div>
        <section className="panel">
          <b>Conta sem função atribuída</b>
          <p className="mut">Peça ao administrador para atribuir uma função à conta {email}.</p>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Sair</button>
        </section>
      </main>
    );
  }
  return <Main prof={prof} />;
}

function Main({ prof }: { prof: Profile }) {
  const dia = useDay();
  const orders = useOrders(dia);
  const menu = useMenu();
  const reviewUrl = useSetting("review_url");
  const online = useOnline();
  const qr = useRef<HTMLDialogElement>(null);

  const all = KITCHEN ? ["pedidos", "cozinha", "caixa", "resumo", "cardapio"] : ["pedidos", "caixa", "resumo", "cardapio"];
  const tabs = prof.papel === "admin" ? all : [prof.papel];
  const [view, setView] = useState(tabs[0]);
  const cur = tabs.includes(view) ? view : tabs[0];

  return (
    <>
      {!online && <div className="offline">Sem ligação à internet. Os pedidos só funcionam quando a ligação voltar.</div>}
      <header>
        <b className="logo">Comanda</b>
        <span className="who">{prof.nome || ROLE_LABEL[prof.papel]}</span>
        <ThemeButton />
        <button onClick={() => qr.current?.showModal()}>Avaliar</button>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      {tabs.length > 1 && (
        <nav>
          {tabs.map((t) => (
            <button key={t} className={`tab${t === cur ? " on" : ""}`} onClick={() => setView(t)}>{TAB_LABEL[t]}</button>
          ))}
        </nav>
      )}
      <main>
        {cur === "pedidos" && <Pedidos orders={orders} menu={menu} />}
        {cur === "cozinha" && (KITCHEN ? <Cozinha orders={orders} /> : (
          <section className="panel"><b>Cozinha desativada</b><p className="mut">A cozinha ainda não usa o sistema.</p></section>
        ))}
        {cur === "caixa" && <Caixa orders={orders} />}
        {cur === "resumo" && <Resumo />}
        {cur === "cardapio" && <Cardapio menu={menu} />}
      </main>
      <dialog ref={qr}>
        <h2>Avalie-nos no Google</h2>
        {reviewUrl ? (
          <div id="qr"><QRCodeSVG value={reviewUrl} size={220} /></div>
        ) : (
          <p className="mut">O administrador ainda não guardou o link do Google Review.</p>
        )}
        <p><button className="ghost" onClick={() => qr.current?.close()}>Fechar</button></p>
      </dialog>
    </>
  );
}
