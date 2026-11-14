# Comanda — sistema de pedidos para restaurante

React + TypeScript + Vite no ecrã, Supabase (PostgreSQL, login e tempo real) no servidor.

Funções: **pedidos** (envia pedidos, cancela com confirmação), **cozinha** (novos, em preparo, prontos, 1 toque por passo),
**caixa** (regista pagamentos), **admin** (tudo + resumo do dia, exportação CSV, cardápio e link do Google Review).

## Fluxo atual (pedidos + caixa)
1. **Pedidos** monta o pedido (produto a produto) e envia para o caixa.
2. **Caixa** vê o pedido detalhado (produto, quantidade, preço, observações), lança-o no Wintouch e carrega em **Lançado no Wintouch**.
3. **Caixa** regista o pagamento. O **admin** vê tudo, o gráfico (dia, mês ou ano) e cria a planilha Excel.

O botão ☀/☾/◐ no topo alterna entre tema claro, escuro e automático.

## 1. Requisitos
- Node.js 18 ou superior (https://nodejs.org)
- Um projeto no Supabase (https://supabase.com)


## Notas
- O sistema precisa de internet. Sem ligação, aparece um aviso no topo e os pedidos não são enviados.
- O servidor recalcula o total a partir do cardápio; só "item livre" aceita preço manual.
- Cada função só altera o que lhe cabe (regras no `schema.sql`, não apenas no ecrã).
- Fuso horário: `Europe/Lisbon` (em `src/lib.ts` e `supabase/schema.sql`).
- Planilha: o botão **Criar planilha** (separador Resumo) gera um ficheiro Excel (.xlsx) do dia, mês ou ano escolhido. Abre também no Google Sheets.
