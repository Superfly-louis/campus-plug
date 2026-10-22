import type { Database } from '../../types/database.types';

export type DbOrderStatus = Database['public']['Enums']['order_status'];

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

export function statusesForFilter(filter: OrderListFilter): readonly DbOrderStatus[] | null {
  if (filter === 'all') return null;
  if (filter === 'closed') return ['rejected', 'cancelled'];
  return [filter];
}
