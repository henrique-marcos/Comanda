import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../supabase";
import { ThemeButton } from "../ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr("Email ou senha incorretos.");
    setBusy(false);
  }

  return (
    <main>
      <div className="theme-corner"><ThemeButton /></div>
      <form className="login" onSubmit={go}>
        <h1>Comanda</h1>
        <p className="mut">Entre com a sua conta.</p>
        <label>Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Senha
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </label>
        <p className="err">{err}</p>
        <button className="pri" disabled={busy}>Entrar</button>
      </form>
    </main>
  );
}
