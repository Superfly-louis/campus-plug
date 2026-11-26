import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { TextField } from '@/components/ui/TextField';
import { categoryVisual } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCategories } from '@/hooks/queries/useCategories';
import { useCampusShops, useCreateBuyerRequest } from '@/hooks/queries/useRequests';
import { toFriendlyError } from '@/lib/errors';
import { useThemeMode } from '@/lib/themeMode';
import { categoryIdSchema, fieldError, requestBodySchema, requestTitleSchema } from '@/lib/validation';

type RequestComposerProps = {
  visible: boolean;
  initialVendorId?: string;
  initialShopName?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function RequestComposer({
  visible,
  initialVendorId,
  initialShopName,
  onClose,
  onCreated,
}: RequestComposerProps) {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const shops = useCampusShops(visible);
  const create = useCreateBuyerRequest();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState<string | null>(initialVendorId ? initialVendorId : null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleError = tried ? fieldError(requestTitleSchema, title) : null;
  const bodyError = tried ? fieldError(requestBodySchema, body) : null;
  const categoryError = tried ? fieldError(categoryIdSchema, categoryId) : null;
  const presetMissing =
    Boolean(initialVendorId) && !(shops.data ?? []).some((shop) => shop.id === initialVendorId);

  function submit() {
    setTried(true);
    setError(null);
    if (
      fieldError(requestTitleSchema, title) ||
      fieldError(requestBodySchema, body) ||
      fieldError(categoryIdSchema, categoryId)
    ) {
      return;
    }
    create.mutate(
      { title, body, categoryId, vendorId },
      {
        onSuccess: (id) => onCreated(id),
        onError: (caught) => setError(toFriendlyError(caught)),
      },
    );
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close request" onPress={onClose} style={{ flex: 1 }} />
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={typography.h2}>Post a request</Text>
            <IconButton accessibilityLabel="Close" name="x" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={typography.body}>
              People on your campus can see this. It stays on the board for 14 days.
            </Text>
            <TextField
              error={titleError ?? undefined}
              label="What do you need?"
              onChangeText={setTitle}
              value={title}
            />
            <TextField
              error={bodyError ?? undefined}
              label="Details"
              multiline
              onChangeText={setBody}
              placeholder="Size, time, or anything else that helps"
              value={body}
            />
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.bodyMedium}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {(categories.data ?? []).map((category) => {
                  const visual = categoryVisual(category.slug, category.name);
                  return (
                    <Chip
                      active={categoryId === category.id}
                      key={category.id}
                      label={visual.label}
                      onPress={() => setCategoryId(category.id)}
                    />
                  );
                })}
              </View>
              {categoryError ? <InlineError message={categoryError} /> : null}
              {categories.isError ? <InlineError message={toFriendlyError(categories.error)} /> : null}
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.bodyMedium}>Who should see it</Text>
              <Text style={typography.caption}>
                Everyone on your campus can read it. A named shop also gets a notification.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Chip active={vendorId === null} label="Anyone on campus" onPress={() => setVendorId(null)} />
                {presetMissing && initialVendorId ? (
                  <Chip
                    active={vendorId === initialVendorId}
                    label={initialShopName || 'This shop'}
                    onPress={() => setVendorId(initialVendorId)}
                  />
                ) : null}
                {(shops.data ?? []).map((shop) => (
                  <Chip
                    active={vendorId === shop.id}
                    key={shop.id}
                    label={shop.shopName}
                    onPress={() => setVendorId(shop.id)}
                  />
                ))}
              </View>
            </View>
            {error ? <InlineError message={error} /> : null}
            <Button label="Post request" loading={create.isPending} onPress={submit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
