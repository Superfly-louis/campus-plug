-- Run this in the Supabase SQL editor.
-- get_or_create_conversation names its argument vendor_id, and conversations
-- also has a vendor_id column. The unqualified name in the lookup is ambiguous.

create or replace function public.get_or_create_conversation(vendor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select owner_id into v_owner
  from public.vendors
  where id = get_or_create_conversation.vendor_id;

  if not found or not public.vendor_is_public(get_or_create_conversation.vendor_id) then
    raise exception 'vendor is not available';
  end if;

  if v_owner = v_uid then
    raise exception 'you cannot start a conversation with your own shop';
  end if;

  insert into public.conversations (buyer_id, vendor_id, vendor_user_id)
  values (v_uid, get_or_create_conversation.vendor_id, v_owner)
  on conflict on constraint conversations_buyer_vendor_key do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select conversations.id into v_conversation_id
    from public.conversations
    where conversations.buyer_id = v_uid
      and conversations.vendor_id = get_or_create_conversation.vendor_id;
  end if;

  if v_conversation_id is null then
    raise exception 'could not open conversation';
  end if;

  return v_conversation_id;
end;
$$;
