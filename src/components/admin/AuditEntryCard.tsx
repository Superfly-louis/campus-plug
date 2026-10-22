import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { AuditEntry } from '@/lib/api/admin';

import type { Json } from '../../../types/database.types';

type AuditEntryCardProps = {
  entry: AuditEntry;
  when: string;
};

function textValue(data: Json, key: string): string {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return '';
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function titleFor(entry: AuditEntry): string {
  const decision = textValue(entry.metadata, 'decision');
  const status = textValue(entry.metadata, 'status');
  if (entry.action === 'review_vendor' && decision === 'approved') return 'Shop approved';
  if (entry.action === 'review_vendor' && decision === 'rejected') return 'Shop not approved';
  if (entry.action === 'remove_vendor') return 'Shop removed';
  if (entry.action === 'moderate_product' && status === 'hidden') return 'Product hidden';
  if (entry.action === 'moderate_product' && status === 'removed_by_admin') return 'Product removed';
  if (entry.action === 'moderate_product' && status === 'active') return 'Product shown';
  return entry.action;
}

export function AuditEntryCard({ entry, when }: AuditEntryCardProps) {
  const admin = entry.adminName?.trim() || 'Deleted user';
  const reason = textValue(entry.metadata, 'reason');
  return (
    <Card>
      <View style={{ gap: spacing.xxs }}>
        <Text style={typography.bodyMedium}>{titleFor(entry)}</Text>
        <Text style={typography.caption}>{`${admin} · ${when}`}</Text>
      </View>
      {reason ? <Text style={[typography.body, { color: colors.textMuted }]}>{reason}</Text> : null}
    </Card>
  );
}
