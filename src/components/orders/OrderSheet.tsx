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
import { useVendorProducts } from '@/hooks/queries/useProducts';
import { toFriendlyError } from '@/lib/errors';
import type { OrderSummary } from '@/lib/api/orders';
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
  const [lines, setLines] = useState(initialItems);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [note, setNote] = useState('');
  const [catalog, setCatalog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const products = useVendorProducts(vendorId, 'public', visible && catalog);
  const available = (products.data ?? []).filter(
    (row) => row.product.is_available && !lines.some((line) => line.productId === row.product.id),
  );
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function reset() {
    setLines(initialItems);
    setMeetingPoint('');
    setNote('');
    setCatalog(false);
    setFormError(null);
  }

  function submit() {
    setFormError(null);
    place.mutate(
      { vendorId, items: lines, meetingPoint, note },
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.body}>Cash on delivery</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Pay when you meet</Text>
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
