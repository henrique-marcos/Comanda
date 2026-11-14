# Comanda — sistema de pedidos para restaurante

React + TypeScript + Vite no ecrã, Supabase (PostgreSQL, login e tempo real) no servidor.

Funções: **pedidos** (envia pedidos, cancela com confirmação), **cozinha** (novos, em preparo, prontos, 1 toque por passo),
**caixa** (regista pagamentos), **admin** (tudo + resumo do dia, exportação CSV, cardápio e link do Google Review).

## Fluxo atual (pedidos + caixa)
1. **Pedidos** monta o pedido (produto a produto) e envia para o caixa.
2. **Caixa** vê o pedido detalhado (produto, quantidade, preço, observações), lança-o no Wintouch e carrega em **Lançado no Wintouch**.
3. **Caixa** regista o pagamento. O **admin** vê tudo, o gráfico (dia, mês ou ano) e cria a planilha Excel.

A cozinha está desligada. Para a ativar mais tarde, mude `KITCHEN` para `true` em `src/config.ts`.
O botão ☀/☾/◐ no topo alterna entre tema claro, escuro e automático.

## 1. Requisitos
- Node.js 18 ou superior (https://nodejs.org)
- Um projeto no Supabase (https://supabase.com)

## 2. Base de dados
1. No Supabase abra **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
2. Em **Authentication > Sign In / Providers** (ou *Providers > Email*), **desligue o registo público** ("Allow new users to sign up").
   Assim só entram contas criadas por si.
3. Em **Authentication > Users > Add user**, crie uma conta por pessoa (email + senha, marque *Auto Confirm User*).
4. Atribua a função de cada conta no SQL Editor (valores: `pedidos`, `cozinha`, `caixa`, `admin`).
   Comece pelo administrador:

```sql
insert into public.profiles (id, nome, papel)
select id, 'O seu nome', 'admin' from auth.users where email = 'admin@exemplo.com';

insert into public.profiles (id, nome, papel)
select id, 'Maria', 'pedidos' from auth.users where email = 'maria@exemplo.com';
```

> **Já tinha executado o `schema.sql` da versão 1?** Execute também `supabase/migracao-2.sql` e depois `supabase/migracao-3.sql` (uma vez cada) no SQL Editor.

## 3. Ligar a aplicação
1. Copie `.env.example` para `.env`.
2. Em **Project Settings > API**, copie o *Project URL* e a chave pública (*anon* ou *publishable*) para o `.env`.
   Nunca use a chave `service_role`.

## 4. Executar
```bash
npm install
npm run dev
```
Abra o endereço que aparece no terminal (normalmente http://localhost:5173).
Para testar o tempo real, entre com duas contas em dois navegadores (ou um em janela anónima).

## 5. Publicar (mais tarde)
`npm run build` gera a pasta `dist`, que pode ser publicada na Vercel, Netlify ou Cloudflare Pages.
Defina as mesmas duas variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no serviço escolhido.

## Notas
- O sistema precisa de internet. Sem ligação, aparece um aviso no topo e os pedidos não são enviados.
- O servidor recalcula o total a partir do cardápio; só "item livre" aceita preço manual.
- Cada função só altera o que lhe cabe (regras no `schema.sql`, não apenas no ecrã).
- Fuso horário: `Europe/Lisbon` (em `src/lib.ts` e `supabase/schema.sql`).
- Planilha: o botão **Criar planilha** (separador Resumo) gera um ficheiro Excel (.xlsx) do dia, mês ou ano escolhido. Abre também no Google Sheets.
