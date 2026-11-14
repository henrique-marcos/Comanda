-- =====================================================================
-- Comanda — migração 2 (para quem já executou o schema.sql da versão 1)
-- Acrescenta: lançamento no Wintouch, relatórios do admin (gráfico).
-- Execute UMA vez em: Supabase > SQL Editor > New query > Run
-- (Em instalações novas NÃO é preciso: o schema.sql já inclui tudo.)
-- =====================================================================

alter table public.orders add column if not exists lancado boolean not null default false;
alter table public.orders add column if not exists lancado_em timestamptz;

create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  l jsonb; pr numeric; q int; t numeric := 0; out jsonb := '[]'::jsonb;
begin
  perform pg_advisory_xact_lock(7001);
  select coalesce(max(numero), 0) + 1 into new.numero from public.orders where dia = new.dia;

  if jsonb_typeof(new.itens) <> 'array' or jsonb_array_length(new.itens) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  for l in select * from jsonb_array_elements(new.itens) loop
    q := (l->>'q')::int;
    if coalesce((l->>'ex')::boolean, false) then
      pr := (l->>'p')::numeric;                       -- item livre: preço manual
    else
      select preco into pr from public.menu_items where id = (l->>'id')::bigint;  -- preço do cardápio
    end if;
    if pr is null or pr <= 0 or q is null or q < 1 then
      raise exception 'Item inválido no pedido';
    end if;
    out := out || jsonb_build_array(jsonb_build_object(
      'id', l->'id', 'n', left(l->>'n', 80), 'p', pr, 'q', q,
      'ex', coalesce((l->>'ex')::boolean, false)));
    t := t + pr * q;
  end loop;

  new.itens := out;
  new.total := round(t, 2);
  new.estado := 'novo'; new.pago := false; new.lancado := false; new.lancado_em := null;
  new.pago_em := null; new.pronto_em := null; new.cancelado_em := null;
  new.criado_em := now(); new.criado_por := auth.uid();
  return new;
end $$;

create or replace function public.orders_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.meu_papel();
begin
  if r is null then raise exception 'Sem permissão'; end if;

  if (new.id, new.dia, new.numero, new.criado_em, new.itens, new.observacao, new.total, new.criado_por)
     is distinct from
     (old.id, old.dia, old.numero, old.criado_em, old.itens, old.observacao, old.total, old.criado_por)
  then
    raise exception 'Só é possível alterar o estado, o lançamento e o pagamento';
  end if;

  if r = 'cozinha' then
    if new.pago is distinct from old.pago or new.lancado is distinct from old.lancado
       or old.estado = 'cancelado' or new.estado = 'cancelado' then
      raise exception 'A cozinha só pode alterar o estado de preparo';
    end if;
  elsif r = 'caixa' then
    if new.estado is distinct from old.estado or old.estado = 'cancelado' then
      raise exception 'O caixa só pode registar lançamentos e pagamentos';
    end if;
  elsif r = 'pedidos' then
    if new.pago is distinct from old.pago or new.lancado is distinct from old.lancado
       or new.estado <> 'cancelado' or old.estado = 'cancelado' or old.pago or old.lancado then
      raise exception 'Só é possível cancelar pedidos ainda não lançados nem pagos';
    end if;
  end if;  -- admin: sem restrições

  if new.pago and not new.lancado then
    raise exception 'Só é possível registar o pagamento depois de lançar o pedido no programa de caixa';
  end if;

  if new.estado = 'pronto' and old.estado <> 'pronto' then new.pronto_em := now(); end if;
  if new.estado = 'cancelado' and old.estado <> 'cancelado' then new.cancelado_em := now(); end if;
  if new.lancado and not old.lancado then new.lancado_em := now(); end if;
  if not new.lancado then new.lancado_em := null; end if;
  if new.pago and not old.pago then new.pago_em := now(); end if;
  if not new.pago then new.pago_em := null; end if;
  return new;
end $$;

-- ---------- Relatórios para o admin (gráfico e mais vendidos) ----------
create or replace function public.resumo(p_inicio date, p_fim date, p_agrupar text)
returns table (bucket text, pedidos int, total numeric, recebido numeric, cancelados int)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.meu_papel(), '') <> 'admin' then raise exception 'Sem permissão'; end if;
  if p_agrupar not in ('hora', 'dia', 'mes') then raise exception 'Agrupamento inválido'; end if;
  return query
  select case p_agrupar
           when 'hora' then lpad(extract(hour from (o.criado_em at time zone 'Europe/Lisbon'))::int::text, 2, '0')
           when 'dia'  then o.dia::text
           else to_char(o.dia, 'YYYY-MM') end,
         (count(*) filter (where o.estado <> 'cancelado'))::int,
         coalesce(sum(o.total) filter (where o.estado <> 'cancelado'), 0)::numeric,
         coalesce(sum(o.total) filter (where o.estado <> 'cancelado' and o.pago), 0)::numeric,
         (count(*) filter (where o.estado = 'cancelado'))::int
  from public.orders o
  where o.dia between p_inicio and p_fim
  group by 1
  order by 1;
end $$;

create or replace function public.mais_vendidos(p_inicio date, p_fim date)
returns table (nome text, qtd int)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.meu_papel(), '') <> 'admin' then raise exception 'Sem permissão'; end if;
  return query
  select e->>'n', (sum((e->>'q')::int))::int
  from public.orders o cross join lateral jsonb_array_elements(o.itens) as e
  where o.dia between p_inicio and p_fim and o.estado <> 'cancelado'
  group by 1
  order by 2 desc
  limit 10;
end $$;

revoke execute on function public.resumo(date, date, text), public.mais_vendidos(date, date) from public, anon;
grant execute on function public.resumo(date, date, text), public.mais_vendidos(date, date) to authenticated;

