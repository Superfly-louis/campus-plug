import { Icon } from '@/components/ui/Icon';
import { icon } from '@/constants/theme';

export type ReceiptState = 'sent' | 'delivered' | 'read';

const labels: Record<ReceiptState, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
};

type ReceiptMarksProps = {
  state: ReceiptState;
};

export function receiptState(read: boolean, online: boolean): ReceiptState {
  if (read) return 'read';
  if (online) return 'delivered';
  return 'sent';
}

export function ReceiptMarks({ state }: ReceiptMarksProps) {
  return (
    <Icon
      accessibilityLabel={labels[state]}
      color={state === 'read' ? 'primary' : 'lilac'}
      name={state === 'sent' ? 'check' : 'check-check'}
      size={icon.sm}
      strokeWidth={2.6}
    />
  );
}
