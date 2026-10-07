export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function webhookSecretMatches(req: Request, envName: string): Promise<boolean> {
  const expected = Deno.env.get(envName);
  const received = req.headers.get('x-webhook-secret');
  if (!expected || !received) return false;

  const encoder = new TextEncoder();
  const [expectedHash, receivedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const receivedBytes = new Uint8Array(receivedHash);
  let mismatch = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    mismatch |= expectedBytes[index] ^ receivedBytes[index];
  }
  return mismatch === 0;
}
