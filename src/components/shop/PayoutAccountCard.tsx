import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { TextField } from '@/components/ui/TextField';
import { colors, layout, radius, spacing, typography } from '@/constants/theme';
import { useConnectPayoutAccount, usePayoutBanks, usePayoutStatus, useResolvePayoutAccount } from '@/hooks/queries/usePayout';
import type { PayoutBank } from '@/lib/api/payout';
import { toFriendlyError } from '@/lib/errors';
import { useThemeMode } from '@/lib/themeMode';

export function PayoutAccountCard() {
  useThemeMode();
  const status = usePayoutStatus();
  const [editing, setEditing] = useState(false);
  const connected = status.data?.connected === true;
  const accountName = status.data?.accountName;
  const bankName = status.data?.bankName;
  const destination = accountName
    ? bankName
      ? `Online payments go to ${accountName} at ${bankName}.`
      : `Online payments go to ${accountName}.`
    : 'A payout account is connected.';

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.bodyMedium}>Payout account</Text>
        {status.isPending ? <Text style={typography.bodySmall}>Checking the payout account…</Text> : null}
        {status.isError ? <InlineError message={toFriendlyError(status.error)} /> : null}
        {status.isSuccess && connected && !editing ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.body}>{destination}</Text>
            <Button label="Change account" onPress={() => setEditing(true)} size="md" variant="outline" />
          </View>
        ) : null}
        {status.isSuccess && (!connected || editing) ? (
          <PayoutAccountForm
            onCancel={connected ? () => setEditing(false) : null}
            onSaved={() => setEditing(false)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function PayoutAccountForm({ onCancel, onSaved }: { onCancel: (() => void) | null; onSaved: () => void }) {
  useThemeMode();
  const banks = usePayoutBanks(true);
  const resolve = useResolvePayoutAccount();
  const connect = useConnectPayoutAccount();
  const [bank, setBank] = useState<PayoutBank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [settlementNumber, setSettlementNumber] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [picker, setPicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const number = accountNumber.replace(/\s+/g, '');
  const readyToCheck = bank != null && /^[0-9]{10,16}$/.test(number);

  function clearResolution() {
    setResolvedName(null);
    setSettlementNumber(null);
    setUnconfirmed(false);
  }

  function chooseBank(next: PayoutBank) {
    setBank(next);
    clearResolution();
    setPicker(false);
  }

  function checkAccount() {
    if (!bank) return;
    setFormError(null);
    clearResolution();
    resolve.mutate(
      { bankCode: bank.code, accountNumber: number },
      {
        onSuccess: (result) => {
          setResolvedName(result.accountName);
          setSettlementNumber(result.accountNumber);
          setUnconfirmed(result.unconfirmed);
        },
        onError: (error) => setFormError(toFriendlyError(error)),
      },
    );
  }

  function saveAccount() {
    if (!bank || (!resolvedName && !unconfirmed)) return;
    setFormError(null);
    connect.mutate(
      { bankCode: bank.code, accountNumber: settlementNumber ?? number, accountName: resolvedName ?? '' },
      {
        onSuccess: () => onSaved(),
        onError: (error) => setFormError(toFriendlyError(error)),
      },
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.body}>
        Add the bank or mobile money account that should receive online payments. Paystack shows the account name before it is saved.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a bank or mobile money"
        onPress={() => setPicker(true)}
        style={{
          minHeight: layout.minTouchTarget,
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: layout.borderWidth,
          borderColor: colors.border,
        }}
      >
        <Text style={typography.caption}>Bank or mobile money</Text>
        <Text style={typography.body}>{bank?.name ?? 'Choose one'}</Text>
      </Pressable>
      <TextField
        autoCapitalize="none"
        keyboardType="number-pad"
        label="Account number"
        onChangeText={(value) => {
          setAccountNumber(value);
          clearResolution();
        }}
        placeholder="Account number"
        value={accountNumber}
      />
      {banks.isError ? <InlineError message={toFriendlyError(banks.error)} /> : null}
      {resolvedName ? <Text style={typography.bodyMedium}>{`This account belongs to ${resolvedName}.`}</Text> : null}
      {unconfirmed ? (
        <Text style={typography.body}>
          Paystack test mode cannot confirm a real wallet. Saving this only lets you try a test payment.
        </Text>
      ) : null}
      {formError ? <InlineError message={formError} /> : null}
      {resolvedName || unconfirmed ? (
        <Button
          label={unconfirmed ? 'Save test account' : 'Use this account'}
          loading={connect.isPending}
          onPress={saveAccount}
        />
      ) : (
        <Button disabled={!readyToCheck} label="Check account" loading={resolve.isPending} onPress={checkAccount} />
      )}
      {onCancel ? <Button label="Cancel" onPress={onCancel} size="md" variant="ghost" /> : null}
      <BankPicker
        banks={banks.data ?? []}
        loading={banks.isPending}
        onClose={() => setPicker(false)}
        onSelect={chooseBank}
        visible={picker}
      />
    </View>
  );
}

function BankPicker({
  visible,
  loading,
  banks,
  onClose,
  onSelect,
}: {
  visible: boolean;
  loading: boolean;
  banks: readonly PayoutBank[];
  onClose: () => void;
  onSelect: (bank: PayoutBank) => void;
}) {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = query.length === 0 ? banks : banks.filter((bank) => bank.name.toLowerCase().includes(query));

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Close bank list"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay }}
        />
        <View
          style={{
            maxHeight: '80%',
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            backgroundColor: colors.surface,
            gap: spacing.md,
          }}
        >
          <Text accessibilityRole="header" style={typography.h2}>
            Choose a bank or mobile money
          </Text>
          <TextField label="Search" onChangeText={setSearch} placeholder="Bank name" value={search} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {loading ? <Text style={typography.bodySmall}>Loading banks…</Text> : null}
            {!loading && shown.length === 0 ? <Text style={typography.bodySmall}>No bank matches that name.</Text> : null}
            {shown.map((bank) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={bank.name}
                key={bank.code}
                onPress={() => onSelect(bank)}
                style={{
                  minHeight: layout.minTouchTarget,
                  justifyContent: 'center',
                  borderTopWidth: layout.borderWidth,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={typography.body}>{bank.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
