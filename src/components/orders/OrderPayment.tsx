import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { PriceText } from '@/components/marketplace/PriceText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { spacing, typography } from '@/constants/theme';
import { useCreatePayment, useLatestPayment, useVerifyPayment } from '@/hooks/queries/usePayments';
import type { OrderSummary } from '@/lib/api/orders';
import { toFriendlyError } from '@/lib/errors';
import { formatPesewas } from '@/lib/format';
import { useThemeMode } from '@/lib/themeMode';

type OrderPaymentProps = {
  order: OrderSummary;
  isBuyer: boolean;
  isVendor: boolean;
};

type BuyerPayState = 'awaiting' | 'confirming' | 'paid' | 'failed' | 'expired' | 'refund_pending' | 'refunded';

function useTimeLeft(dueAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!dueAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [dueAt]);
  if (!dueAt) return null;
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return null;
  return due - now;
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function FeeLine({ label, pesewas }: { label: string; pesewas: number | null }) {
  if (pesewas == null) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text style={typography.body}>{label}</Text>
      <Text style={typography.bodyMedium}>{formatPesewas(pesewas)}</Text>
    </View>
  );
}

export function OrderPayment({ order, isBuyer, isVendor }: OrderPaymentProps) {
  useThemeMode();
  const online = order.paymentMethod === 'paystack';
  const timeLeft = useTimeLeft(online ? order.paymentDueAt : null);
  const payment = useLatestPayment(order.id, online);
  const create = useCreatePayment();
  const verify = useVerifyPayment();
  const [phase, setPhase] = useState<'idle' | 'confirming'>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const waitingForReturn = useRef(false);
  const verifyPayment = verify.mutate;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !waitingForReturn.current) return;
      waitingForReturn.current = false;
      setPhase('confirming');
      verifyPayment(order.id, {
        onError: (error) => setPayError(toFriendlyError(error)),
        onSettled: () => setPhase('idle'),
      });
    });
    return () => subscription.remove();
  }, [order.id, verifyPayment]);

  if (!online) return null;

  const windowClosed = timeLeft != null && timeLeft <= 0;
  const paid = order.paymentStatus === 'paid';
  const attempt = payment.data;
  const failedAttempt = attempt?.status === 'failed' || attempt?.status === 'abandoned';

  let buyerState: BuyerPayState | null = null;
  if (order.paymentStatus === 'refund_pending') buyerState = 'refund_pending';
  else if (order.paymentStatus === 'refunded') buyerState = 'refunded';
  else if (paid) buyerState = 'paid';
  else if (order.status === 'cancelled' && windowClosed) buyerState = 'expired';
  else if (order.status === 'accepted' && windowClosed) buyerState = 'expired';
  else if (phase === 'confirming' || order.paymentStatus === 'pending') buyerState = 'confirming';
  else if (order.status === 'accepted' && (order.paymentStatus === 'failed' || failedAttempt)) buyerState = 'failed';
  else if (order.status === 'accepted' && order.paymentStatus === 'unpaid') buyerState = 'awaiting';

  async function payNow() {
    setPayError(null);
    try {
      const checkout = await create.mutateAsync(order.id);
      waitingForReturn.current = true;
      const result = await WebBrowser.openBrowserAsync(checkout.authorizationUrl);
      if (result.type !== 'opened') {
        waitingForReturn.current = false;
        setPhase('confirming');
        verifyPayment(order.id, {
          onError: (error) => setPayError(toFriendlyError(error)),
          onSettled: () => setPhase('idle'),
        });
      }
    } catch (error) {
      waitingForReturn.current = false;
      setPayError(toFriendlyError(error));
    }
  }

  const expiredCopy =
    order.status === 'cancelled'
      ? 'This order was cancelled because payment was not received.'
      : 'The payment window has closed.';
  const clock = timeLeft == null ? null : countdown(timeLeft);
  const showVendorWait =
    isVendor &&
    order.status === 'accepted' &&
    !paid &&
    buyerState !== 'refund_pending' &&
    buyerState !== 'refunded' &&
    buyerState !== 'expired';
  const showBuyer = isBuyer && buyerState != null;

  if (
    !showBuyer &&
    !showVendorWait &&
    !(isVendor && (paid || buyerState === 'refund_pending' || buyerState === 'refunded' || buyerState === 'expired'))
  ) {
    return null;
  }

  return (
    <Card>
      {showVendorWait ? (
        <View style={{ gap: spacing.xxs }}>
          <Text style={typography.bodyMedium}>Waiting for the buyer to pay</Text>
          {clock ? <Text style={typography.body}>{`Time left ${clock}`}</Text> : null}
        </View>
      ) : null}
      {isVendor && buyerState === 'expired' ? (
        <Text style={typography.body}>{expiredCopy}</Text>
      ) : null}
      {isVendor && paid ? (
        <View style={{ gap: spacing.sm }}>
          <Badge label="Paid online" tone="lime" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={typography.body}>Order total</Text>
            <PriceText amount={order.totalAmount} />
          </View>
          <FeeLine label="Platform charge" pesewas={attempt?.platformFeePesewas ?? null} />
          <FeeLine label="Paystack fee" pesewas={attempt?.paystackFeePesewas ?? null} />
          <FeeLine label="You receive" pesewas={attempt?.vendorAmountPesewas ?? null} />
        </View>
      ) : null}
      {isVendor && buyerState === 'refund_pending' ? <Text style={typography.body}>Refund pending</Text> : null}
      {isVendor && buyerState === 'refunded' ? <Text style={typography.body}>Refunded</Text> : null}
      {showBuyer && buyerState === 'awaiting' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.bodyMedium}>Awaiting payment</Text>
          {clock ? <Text style={typography.body}>{`Pay within ${clock}`}</Text> : null}
          <Button label="Pay now" loading={create.isPending} onPress={() => void payNow()} />
        </View>
      ) : null}
      {showBuyer && buyerState === 'confirming' ? <Text style={typography.bodyMedium}>Confirming payment…</Text> : null}
      {showBuyer && buyerState === 'paid' ? <Text style={typography.bodyMedium}>Paid</Text> : null}
      {showBuyer && buyerState === 'failed' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.bodyMedium}>Payment failed</Text>
          <Button label="Try again" loading={create.isPending} onPress={() => void payNow()} />
        </View>
      ) : null}
      {showBuyer && buyerState === 'expired' ? (
        <Text style={typography.body}>{expiredCopy}</Text>
      ) : null}
      {showBuyer && buyerState === 'refund_pending' ? <Text style={typography.bodyMedium}>Refund pending</Text> : null}
      {showBuyer && buyerState === 'refunded' ? <Text style={typography.bodyMedium}>Refunded</Text> : null}
      {payError ? <InlineError message={payError} /> : null}
    </Card>
  );
}
