-- Ensure bid updates are published to Supabase Realtime channels.

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.bids';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.auctions';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
