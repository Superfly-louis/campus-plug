import { supabase } from '@/lib/supabase';

import { raiseIfError, requireUserId } from '@/lib/api/shared';

export type VendorChargeStatus = 'open' | 'reserved' | 'collected';

export type VendorCharge = {
  id: string;
  orderId: string;
  amountPesewas: number;
  status: VendorChargeStatus;
  createdAt: string;
};

function isChargeStatus(value: string): value is VendorChargeStatus {
  return value === 'open' || value === 'reserved' || value === 'collected';
}

export async function listVendorCharges(vendorId: string): Promise<VendorCharge[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('vendor_charges')
    .select('id, order_id, amount_pesewas, status, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });
  if (error) {
    const missing = error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('vendor_charges');
    if (missing) return [];
    raiseIfError(error);
  }
  return (data ?? []).flatMap((row) => {
    if (!isChargeStatus(row.status)) return [];
    return [
      {
        id: row.id,
        orderId: row.order_id,
        amountPesewas: row.amount_pesewas,
        status: row.status,
        createdAt: row.created_at,
      },
    ];
  });
}

export function owedPesewas(charges: readonly VendorCharge[]): number {
  return charges.reduce((sum, charge) => {
    if (charge.status === 'collected') return sum;
    return sum + charge.amountPesewas;
  }, 0);
}
