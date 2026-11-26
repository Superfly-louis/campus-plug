import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { StatusBanner } from '@/components/marketplace/StatusBanner';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { categoryVisual } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import {
  useBuyerRequest,
  useCloseBuyerRequest,
  useOfferOnRequest,
  useRemoveBuyerRequest,
  useRequestOffers,
} from '@/hooks/queries/useRequests';
import type { BuyerRequestStatus } from '@/lib/api/requests';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { formatOrderDate } from '@/lib/format';
import { useThemeMode } from '@/lib/themeMode';
import { fieldError, requestOfferSchema, requestRemovalSchema } from '@/lib/validation';

const statusLabel: Record<BuyerRequestStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  removed: 'Removed',
};

const statusTone: Record<BuyerRequestStatus, BadgeTone> = {
  open: 'lime',
  closed: 'violet',
  removed: 'food',
};

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function offerLabel(count: number): string {
  return count === 1 ? '1 offer' : `${count} offers`;
}

export default function RequestDetailScreen() {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = param(id);
  const { profile, vendor } = useAuth();
  const request = useBuyerRequest(requestId);
  const close = useCloseBuyerRequest();
  const offer = useOfferOnRequest(requestId);
  const remove = useRemoveBuyerRequest(requestId);
  const isAdmin = profile?.role === 'admin';
  const row = request.data;
  const offers = useRequestOffers(requestId, Boolean(row && (row.mine || row.offered || isAdmin)));
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTried, setReasonTried] = useState(false);
  const noteError = tried ? fieldError(requestOfferSchema, note) : null;
  const reasonError = reasonTried ? fieldError(requestRemovalSchema, reason) : null;
  const approved = vendor?.status === 'approved';
  const canOffer = Boolean(
    row && approved && vendor && !vendor.is_paused && row.status === 'open' && !row.mine && !row.offered,
  );
  const shopPaused = Boolean(
    row && approved && vendor?.is_paused && row.status === 'open' && !row.mine && !row.offered,
  );

  function confirmClose() {
    Alert.alert('Close this request?', 'It leaves the campus board. Offers you already have stay in chat.', [
      { text: 'Keep it open', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: () => {
          setError(null);
          close.mutate(requestId, { onError: (caught) => setError(toFriendlyError(caught)) });
        },
      },
    ]);
  }

  function sendOffer() {
    setTried(true);
    setError(null);
    if (fieldError(requestOfferSchema, note)) return;
    offer.mutate(note, {
      onSuccess: (conversationId) => {
        router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
      },
      onError: (caught) => setError(toFriendlyError(caught)),
    });
  }

  function confirmRemove() {
    setReasonTried(true);
    if (fieldError(requestRemovalSchema, reason)) return;
    remove.mutate(reason, {
      onSuccess: () => {
        setRemoving(false);
        setReason('');
        setReasonTried(false);
      },
      onError: (caught) => setError(toFriendlyError(caught)),
    });
  }

  if (request.isPending) {
    return (
      <Screen>
        <MarketplaceState status="loading" />
      </Screen>
    );
  }

  if (request.isError) {
    return (
      <Screen>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <MarketplaceState
          message={toFriendlyError(request.error)}
          onRetry={() => {
            void request.refetch();
          }}
          status="error"
        />
      </Screen>
    );
  }

  if (!row) {
    return (
      <Screen>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <MarketplaceState
          body="It may have been closed, or requests are not ready yet."
          icon="shopping-bag"
          status="empty"
          title="Request not found"
        />
      </Screen>
    );
  }

  const category = categoryVisual(row.categorySlug, row.categoryName).label;
  const audience = row.targetShopName ? `Asked ${row.targetShopName}` : 'For anyone on campus';

  return (
    <Screen
      onRefresh={() => {
        void request.refetch();
        if (row.mine || row.offered || isAdmin) void offers.refetch();
      }}
      refreshing={request.isRefetching && !request.isPending}
      scroll
    >
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={[typography.h1, { flex: 1 }]}>{row.title}</Text>
        <Badge label={statusLabel[row.status]} tone={statusTone[row.status]} />
      </View>
      <Text style={typography.body}>
        {row.buyerName} · {category} · {formatOrderDate(row.createdAt)}
      </Text>
      <Text style={typography.body}>{audience}</Text>
      <Text style={typography.caption}>{row.campus}</Text>
      {row.body ? <Text style={typography.body}>{row.body}</Text> : null}
      {row.removalReason ? <StatusBanner message={row.removalReason} tone="danger" /> : null}
      <Text style={typography.bodyMedium}>{offerLabel(row.offerCount)}</Text>
      {error ? <InlineError message={error} /> : null}
      {row.mine && row.status === 'open' ? (
        <Button label="Close request" loading={close.isPending} onPress={confirmClose} variant="dangerOutline" />
      ) : null}
      {shopPaused ? <Text style={typography.body}>Unpause your shop before you offer.</Text> : null}
      {canOffer ? (
        <Card>
          <Text style={typography.bodyMedium}>Offer to help</Text>
          <TextField
            error={noteError ?? undefined}
            label="How you can help"
            multiline
            onChangeText={setNote}
            value={note}
          />
          <Button label="Send offer" loading={offer.isPending} onPress={sendOffer} />
        </Card>
      ) : null}
      {(offers.data ?? []).map((item) => {
        const canChat = row.mine || item.vendorId === vendor?.id;
        return (
          <Card key={item.id}>
            <Text style={typography.bodyMedium}>{item.shopName}</Text>
            <Text style={typography.body}>{item.note}</Text>
            {canChat ? (
              <Button
                label="Chat"
                onPress={() =>
                  router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.conversationId } })
                }
                variant="outline"
              />
            ) : null}
          </Card>
        );
      })}
      {isAdmin && row.status !== 'removed' ? (
        <Button label="Remove request" onPress={() => setRemoving(true)} variant="danger" />
      ) : null}
      <Modal animationType="fade" transparent visible={removing} onRequestClose={() => setRemoving(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable accessibilityLabel="Close remove request" onPress={() => setRemoving(false)} style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={typography.h2}>Remove this request</Text>
            <TextField
              error={reasonError ?? undefined}
              label="Reason"
              multiline
              onChangeText={setReason}
              value={reason}
            />
            {remove.isError ? <InlineError message={toFriendlyError(remove.error)} /> : null}
            <Button label="Remove" loading={remove.isPending} onPress={confirmRemove} variant="danger" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
