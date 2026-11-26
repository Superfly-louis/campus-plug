import type { Database } from '../../types/database.types';

export type DbOrderStatus = Database['public']['Enums']['order_status'];
export type DbPaymentMethod = Database['public']['Enums']['payment_method'];
export type DbPaymentStatus = Database['public']['Enums']['payment_status'];

/** Values accepted by `StatusPill`. */
export type OrderPillStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'declined' | 'cancelled';

export type OrderAction = 'accept' | 'reject' | 'ready' | 'complete' | 'cancel';

export type OrderListFilter = DbOrderStatus | 'closed' | 'all';

type OrderStatusMeta = {
  label: string;
  pill: OrderPillStatus;
  /** Index into Preparing, Ready, Completed. Null when the three-step line does not apply. */
  timelineStep: 0 | 1 | 2 | null;
  terminal: boolean;
  buyerActions: readonly OrderAction[];
  vendorActions: readonly OrderAction[];
};

export const timelineLabels = ['Preparing', 'Ready', 'Completed'] as const;

export const orderStatus: Record<DbOrderStatus, OrderStatusMeta> = {
  pending: {
    label: 'Pending',
    pill: 'pending',
    timelineStep: null,
    terminal: false,
    buyerActions: ['cancel'],
    vendorActions: ['accept', 'reject'],
  },
  accepted: {
    label: 'Preparing',
    pill: 'preparing',
    timelineStep: 0,
    terminal: false,
    buyerActions: [],
    vendorActions: ['ready', 'cancel'],
  },
  ready: {
    label: 'Ready',
    pill: 'ready',
    timelineStep: 1,
    terminal: false,
    buyerActions: [],
    vendorActions: ['complete'],
  },
  completed: {
    label: 'Completed',
    pill: 'completed',
    timelineStep: 2,
    terminal: false,
    buyerActions: [],
    vendorActions: [],
  },
  rejected: {
    label: 'Declined',
    pill: 'declined',
    timelineStep: null,
    terminal: true,
    buyerActions: [],
    vendorActions: [],
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'cancelled',
    timelineStep: null,
    terminal: true,
    buyerActions: [],
    vendorActions: [],
  },
};

export const actionStatus: Record<OrderAction, DbOrderStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  ready: 'ready',
  complete: 'completed',
  cancel: 'cancelled',
};

export function orderPaymentLabel(method: DbPaymentMethod, status: DbPaymentStatus): string {
  if (method === 'cash_on_delivery' && status === 'unpaid') return 'Cash on delivery';
  switch (status) {
    case 'unpaid':
      return 'Awaiting payment';
    case 'pending':
      return 'Confirming payment';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Payment failed';
    case 'refund_pending':
      return 'Refund pending';
    case 'refunded':
      return 'Refunded';
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function cardPaymentLabel(method: DbPaymentMethod, status: DbPaymentStatus): string | null {
  if (method === 'cash_on_delivery') return 'COD';
  if (method !== 'paystack') return null;
  if (status === 'paid') return 'Paid';
  if (status === 'refund_pending') return 'Refund pending';
  if (status === 'refunded') return 'Refunded';
  return 'Awaiting payment';
}

export function statusesForFilter(filter: OrderListFilter): readonly DbOrderStatus[] | null {
  if (filter === 'all') return null;
  if (filter === 'closed') return ['rejected', 'cancelled'];
  return [filter];
}
