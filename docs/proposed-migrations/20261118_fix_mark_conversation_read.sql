-- Run this in the Supabase SQL editor.
-- mark_conversation_read names its argument conversation_id, and messages
-- also has a conversation_id column. The unqualified name in the update is
-- ambiguous, so opening a chat never marks it read and the tab badge stays.

create or replace function public.mark_conversation_read(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.conversations
    where id = mark_conversation_read.conversation_id
      and (buyer_id = v_uid or vendor_user_id = v_uid)
  ) then
    raise exception 'conversation not found';
  end if;

  update public.messages
  set read_at = pg_catalog.now()
  where messages.conversation_id = mark_conversation_read.conversation_id
    and messages.sender_id is distinct from v_uid
    and messages.read_at is null;
end;
$$;
