-- =====================================================================
-- Comanda — migração 3 (para quem já executou a migracao-2.sql)
-- Regra nova: o pagamento só pode ser registado depois de o pedido ser
-- lançado no programa de caixa (Wintouch). Execute UMA vez no SQL Editor.
-- (Em instalações novas NÃO é preciso: o schema.sql já inclui tudo.)
-- =====================================================================

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

