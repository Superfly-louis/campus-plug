import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuantityStepper } from '@/components/orders/QuantityStepper';
import { PriceText } from '@/components/marketplace/PriceText';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, radius, spacing, typography } from '@/constants/theme';
import { usePlaceOrder } from '@/hooks/queries/useOrders';
import { usePaymentTerms } from '@/hooks/queries/usePayments';
import { useVendorProducts } from '@/hooks/queries/useProducts';
import { useVendor } from '@/hooks/queries/useVendors';
import type { CheckoutPaymentMethod, OrderSummary } from '@/lib/api/orders';
import { toFriendlyError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { useThemeMode } from '@/lib/themeMode';

export type SheetLine = {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

type OrderSheetProps = {
  visible: boolean;
  vendorId: string;
  items: SheetLine[];
  onClose: () => void;
  onPlaced: (order: OrderSummary) => void;
};

export function OrderSheet({ visible, vendorId, items: initialItems, onClose, onPlaced }: OrderSheetProps) {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const place = usePlaceOrder();
  const shop = useVendor(vendorId);
  const terms = usePaymentTerms(visible);
  const [lines, setLines] = useState(initialItems);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [note, setNote] = useState('');
  const [catalog, setCatalog] = useState(false);
  const [choice, setChoice] = useState<CheckoutPaymentMethod>('cash_on_delivery');
  const [formError, setFormError] = useState<string | null>(null);
  const products = useVendorProducts(vendorId, 'public', visible && catalog);
  const available = (products.data ?? []).filter(
    (row) => row.product.is_available && !lines.some((line) => line.productId === row.product.id),
  );
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const minimum = terms.data?.minOnlineOrderGhs ?? null;
  const shopReady = shop.data != null && shop.data.status === 'approved' && !shop.data.is_paused;
  const belowMinimum = minimum != null && Math.round(total * 100) < Math.round(minimum * 100);
  let payOnlineReason: string | null = null;
  if (shop.isPending) payOnlineReason = 'Checking whether this shop can take online payments.';
  else if (!shopReady) payOnlineReason = 'This shop is not ready for online payments.';
  else if (terms.isPending) payOnlineReason = 'Checking the minimum for online payment.';
  else if (terms.isError || minimum == null) payOnlineReason = 'Online payments are not ready yet.';
  else if (belowMinimum) payOnlineReason = `Online orders must be at least ${formatPrice(minimum)}.`;
  const payOnline = payOnlineReason == null && choice === 'paystack';

  function reset() {
    setLines(initialItems);
    setMeetingPoint('');
    setNote('');
    setCatalog(false);
    setChoice('cash_on_delivery');
    setFormError(null);
  }

  function submit() {
    setFormError(null);
    place.mutate(
      { vendorId, items: lines, meetingPoint, note, paymentMethod: payOnline ? 'paystack' : 'cash_on_delivery' },
      {
        onSuccess: (order) => {
          onPlaced(order);
        },
        onError: (error) => setFormError(toFriendlyError(error)),
      },
    );
  }

  return (
    <Modal animationType="slide" onShow={reset} transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityLabel="Close order sheet"
            onPress={onClose}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay }}
          />
          <View
            style={{
              maxHeight: '88%',
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              backgroundColor: colors.surface,
              gap: spacing.md,
            }}
          >
            <Text accessibilityRole="header" style={typography.h2}>
              Place order
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
              {lines.map((line) => (
                <View
                  key={line.productId}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
                    <Text style={typography.bodyMedium} numberOfLines={2}>
                      {line.title}
                    </Text>
                    <PriceText amount={line.unitPrice} />
                  </View>
                  <QuantityStepper
                    label={line.title}
                    onChange={(quantity) =>
                      setLines((current) =>
                        current.map((item) => (item.productId === line.productId ? { ...item, quantity } : item)),
                      )
                    }
                    value={line.quantity}
                  />
                </View>
              ))}
              <Button
                fullWidth={false}
                label={catalog ? 'Hide items' : 'Add another item'}
                onPress={() => setCatalog((open) => !open)}
                size="md"
                variant="secondary"
              />
              {catalog ? (
                products.isPending ? (
                  <Text style={typography.bodySmall}>Loading items from this shop…</Text>
                ) : products.isError ? (
                  <InlineError message={toFriendlyError(products.error)} />
                ) : available.length === 0 ? (
                  <Text style={typography.bodySmall}>Every available item is already in this order.</Text>
                ) : (
                  available.map((row) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${row.product.title}`}
                      key={row.product.id}
                      onPress={() =>
                        setLines((current) => [
                          ...current,
                          {
                            productId: row.product.id,
                            title: row.product.title,
                            unitPrice: row.product.price,
                            quantity: 1,
                          },
                        ])
                      }
                      style={{
                        minHeight: layout.minTouchTarget,
                        justifyContent: 'center',
                        borderTopWidth: layout.borderWidth,
                        borderTopColor: colors.border,
                      }}
                    >
                      <Text style={typography.body}>{row.product.title}</Text>
                    </Pressable>
                  ))
                )
              ) : null}
              <TextField
                label="Where should the vendor meet you?"
                onChangeText={setMeetingPoint}
                placeholder="Hall, hostel, or gate"
                value={meetingPoint}
              />
              <TextField
                label="Note"
                multiline
                onChangeText={setNote}
                placeholder="Optional note for the vendor"
                value={note}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.bodyMedium}>Total</Text>
                <PriceText amount={total} />
              </View>
              <View style={{ gap: spacing.sm }}>
                <PayChoice
                  detail="Pay when you meet"
                  label="Cash on delivery"
                  onPress={() => setChoice('cash_on_delivery')}
                  selected={!payOnline}
                />
                <PayChoice
                  detail="You pay after the vendor accepts your order."
                  disabled={payOnlineReason != null}
                  label="Pay online (mobile money or card)"
                  onPress={() => setChoice('paystack')}
                  selected={payOnline}
                />
                {payOnlineReason ? <Text style={typography.bodySmall}>{payOnlineReason}</Text> : null}
              </View>
              {formError ? <InlineError message={formError} /> : null}
            </ScrollView>
            <Button label="Place order" loading={place.isPending} onPress={submit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PayChoice({
  label,
  detail,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  useThemeMode();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: layout.minTouchTarget,
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: layout.borderWidth,
        borderColor: selected ? colors.primary : colors.border,
        gap: spacing.xxs,
      }}
    >
      <Text style={[typography.bodyMedium, disabled ? { color: colors.textMuted } : null]}>{label}</Text>
      <Text style={typography.bodySmall}>{detail}</Text>
    </Pressable>
  );
}
