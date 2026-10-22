import { Text, View } from 'react-native';

import { PriceText } from '@/components/marketplace/PriceText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing, typography } from '@/constants/theme';
import type { AdminProduct, ProductModerationStatus } from '@/lib/api/admin';

type ProductModerationCardProps = {
  product: AdminProduct;
  listed: string;
  removing: boolean;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onShow: () => void;
  onHide: () => void;
  onStartRemove: () => void;
  onConfirmRemove: () => void;
};

const statusLabel: Record<ProductModerationStatus, string> = {
  active: 'Active',
  hidden: 'Hidden',
  removed_by_admin: 'Removed',
};

export function ProductModerationCard({
  product,
  listed,
  removing,
  reason,
  busy,
  onReasonChange,
  onShow,
  onHide,
  onStartRemove,
  onConfirmRemove,
}: ProductModerationCardProps) {
  const shop = product.shopName.trim() || 'Shop';
  const removed = product.status === 'removed_by_admin';
  return (
    <Card>
      <View style={{ gap: spacing.xxs }}>
        <Text style={typography.bodyMedium}>{product.title}</Text>
        <Text style={typography.caption}>{shop}</Text>
        <PriceText amount={product.price} />
        <Text style={typography.caption}>
          {product.isAvailable ? statusLabel[product.status] : `${statusLabel[product.status]} · Out of stock`}
          {` · ${listed}`}
        </Text>
      </View>
      {product.moderationReason ? (
        <Text style={[typography.body, { color: colors.textMuted }]}>{product.moderationReason}</Text>
      ) : null}
      {removing ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Reason"
            multiline
            onChangeText={onReasonChange}
            placeholder="Why is this product being removed?"
            value={reason}
          />
          <Button disabled={busy} label="Remove product" loading={busy} onPress={onConfirmRemove} variant="danger" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {product.status === 'active' ? null : (
            <View style={{ flex: 1 }}>
              <Button disabled={busy} label="Show" onPress={onShow} />
            </View>
          )}
          {removed || product.status === 'hidden' ? null : (
            <View style={{ flex: 1 }}>
              <Button disabled={busy} label="Hide" onPress={onHide} variant="secondary" />
            </View>
          )}
          {removed ? null : (
            <View style={{ flex: 1 }}>
              <Button disabled={busy} label="Remove" onPress={onStartRemove} variant="danger" />
            </View>
          )}
        </View>
      )}
    </Card>
  );
}
