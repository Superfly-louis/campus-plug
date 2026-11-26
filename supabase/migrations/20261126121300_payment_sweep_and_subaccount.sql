-- Private Paystack subaccount for order splits, and the pending-payment sweep.
-- subaccount_code stays empty until a shop is connected. create-payment refuses
-- online checkout without it.

alter table public.vendor_billing
  add column if not exists subaccount_code text;

alter table public.vendor_billing
  drop constraint if exists vendor_billing_subaccount_code_length;

alter table public.vendor_billing
  add constraint vendor_billing_subaccount_code_length check (
    subaccount_code is null or char_length(subaccount_code) between 1 and 80
  );

create or replace function public.dispatch_edge_function(
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
  if function_name not in ('send-push', 'process-storage-cleanup', 'payments-sweep') then
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
    timeout_milliseconds := case
      when function_name = 'payments-sweep' then 20000
      else 5000
    end
  );
end;
$$;

revoke all on function public.dispatch_edge_function(text, text, jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'payments-sweep') then
    perform cron.unschedule('payments-sweep');
  end if;
end;
$$;

select cron.schedule(
  'payments-sweep',
  '*/5 * * * *',
  $$select public.dispatch_edge_function('payments-sweep', 'payments_sweep_secret', '{}'::jsonb)$$
);
