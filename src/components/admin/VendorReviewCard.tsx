import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing, typography } from '@/constants/theme';
import type { AdminVendor } from '@/lib/api/admin';

type VendorReviewCardProps = {
  shop: AdminVendor;
  ownerPhoto: string | null;
  shopPhoto: string | null;
  applied: string;
  rejecting: boolean;
  reason: string;
  busy: boolean;
  mode?: 'review' | 'remove';
  onReasonChange: (value: string) => void;
  onApprove?: () => void;
  onStartReject: () => void;
  onConfirmReject: () => void;
};

export function VendorReviewCard({
  shop,
  ownerPhoto,
  shopPhoto,
  applied,
  rejecting,
  reason,
  busy,
  mode = 'review',
  onReasonChange,
  onApprove,
  onStartReject,
  onConfirmReject,
}: VendorReviewCardProps) {
  const owner = shop.ownerName?.trim() || 'Deleted user';
  const removing = mode === 'remove';
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={shop.shopName} uri={shopPhoto} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text style={typography.bodyMedium}>{shop.shopName}</Text>
          <Text style={typography.caption}>{owner}</Text>
          <Text style={typography.caption}>{shop.isPaused ? `Paused · ${applied}` : applied}</Text>
        </View>
        <Avatar name={owner} uri={ownerPhoto} />
      </View>
      {shop.description ? (
        <Text numberOfLines={3} style={[typography.body, { color: colors.textMuted }]}>
          {shop.description}
        </Text>
      ) : null}
      {removing && !rejecting ? (
        <Button disabled={busy} label="Remove" onPress={onStartReject} variant="danger" />
      ) : null}
      {removing ? null : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button disabled={busy || !onApprove} label="Approve" onPress={() => onApprove?.()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button disabled={busy} label="Reject" onPress={onStartReject} variant="danger" />
          </View>
        </View>
      )}
      {rejecting ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Reason"
            multiline
            onChangeText={onReasonChange}
            placeholder={removing ? 'Why is this shop being removed?' : 'Why is this shop not approved?'}
            value={reason}
          />
          <Button
            disabled={busy}
            label={removing ? 'Remove shop' : 'Reject shop'}
            loading={busy}
            onPress={onConfirmReject}
            variant="danger"
          />
        </View>
      ) : null}
    </Card>
  );
}
