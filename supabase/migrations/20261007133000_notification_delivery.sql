-- Instant push uses Vault for the project URL and webhook secret, then pg_net.
-- pg_cron repeats the sweep. Neither URL nor secret is stored in this file.
-- Text messages notify the other participant. Order and system messages are
-- already notified by place_order and update_order_status.

alter table public.notifications
  add column push_tickets jsonb,
  add column push_receipt_checked_at timestamptz;

comment on column public.notifications.push_tickets is
  'Expo ticket ids paired with the device token, so a later receipt can deactivate that token.';

create function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  if new.type is distinct from 'text'::public.message_type then
    return new;
  end if;

  select case
    when conversations.buyer_id = new.sender_id then conversations.vendor_user_id
    when conversations.vendor_user_id = new.sender_id then conversations.buyer_id
    else null
  end
  into v_recipient
  from public.conversations
  where conversations.id = new.conversation_id;

  perform public.enqueue_notification(
    v_recipient,
    'message',
    'New message',
    new.body,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id
    )
  );

  return new;
end;
$$;

create trigger messages_notify_recipient
after insert on public.messages
for each row
execute function public.notify_message_recipient();

-- Called by the notification insert trigger and by pg_cron.
-- No-ops until the Vault secrets in supabase/README.md exist.
create function public.dispatch_edge_function(
  function_name text,
  secret_name text,
  payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base_url text;
  v_secret text;
begin
  if function_name not in ('send-push', 'process-storage-cleanup') then
    raise exception 'unknown edge function';
  end if;

  select decrypted_secret into v_base_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = dispatch_edge_function.secret_name
  limit 1;

  if coalesce(v_base_url, '') = '' or coalesce(v_secret, '') = '' then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_base_url, '/') || '/functions/v1/' || function_name,
    body := coalesce(payload, '{}'::jsonb),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
end;
$$;

create function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.dispatch_edge_function(
    'send-push',
    'push_webhook_secret',
    jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

create trigger notifications_dispatch_push
after insert on public.notifications
for each row
execute function public.dispatch_notification_push();

-- Moves due rows two minutes ahead so a webhook and the cron sweep do not send twice.
create function public.claim_push_notifications(notification_id uuid default null)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.notifications
  set next_attempt_at = pg_catalog.now() + interval '2 minutes'
  where id in (
    select candidate.id
    from public.notifications as candidate
    where candidate.push_status in (
        'pending'::public.push_status,
        'failed'::public.push_status
      )
      and candidate.push_attempts < 5
      and candidate.next_attempt_at <= pg_catalog.now()
      and (
        claim_push_notifications.notification_id is null
        or candidate.id = claim_push_notifications.notification_id
      )
    order by candidate.next_attempt_at
    limit 100
    for update skip locked
  )
  returning *;
end;
$$;

select cron.schedule(
  'send-push-sweep',
  '* * * * *',
  $$select public.dispatch_edge_function('send-push', 'push_webhook_secret', '{}'::jsonb)$$
);

select cron.schedule(
  'process-storage-cleanup',
  '*/10 * * * *',
  $$select public.dispatch_edge_function('process-storage-cleanup', 'cleanup_webhook_secret', '{}'::jsonb)$$
);

revoke all on function public.notify_message_recipient() from public, anon, authenticated;
revoke all on function public.dispatch_edge_function(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.dispatch_notification_push() from public, anon, authenticated;
revoke all on function public.claim_push_notifications(uuid) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(uuid) to service_role;
