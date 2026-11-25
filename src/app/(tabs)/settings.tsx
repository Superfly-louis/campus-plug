import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/orders/SegmentedControl';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CampusChoices } from '@/components/ui/CampusChoices';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, icon, spacing, typography } from '@/constants/theme';
import { deleteAccount } from '@/lib/api/notifications';
import { updateEmail, updateProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth';
import { useThemeMode } from '@/lib/themeMode';
import { toFriendlyError } from '@/lib/errors';
import { compressImage, getImageUrl, pickImages, uploadImage } from '@/lib/images';

export default function SettingsScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [campus, setCampus] = useState(profile?.campus_location ?? '');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoUri = localUri ?? getImageUrl('avatars', profile?.avatar_url);

  function edit(update: (value: string) => void) {
    return (value: string) => {
      setNotice(null);
      update(value);
    };
  }

  async function choosePhoto() {
    setError(null);
    setNotice(null);
    try {
      const [uri] = await pickImages(1);
      if (uri) setLocalUri(uri);
    } catch (caught) {
      setError(toFriendlyError(caught));
    }
  }

  async function save() {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const userId = session?.user.id;
      if (!userId) throw new Error('Sign in to continue.');
      let avatarUrl: string | undefined;
      if (localUri) {
        const compressed = await compressImage(localUri, 'logo');
        avatarUrl = await uploadImage('avatars', userId, compressed);
      }
      await updateProfile({ fullName: name, phone, campus, avatarUrl });
      await refreshProfile();
      setLocalUri(null);
      const currentEmail = (session?.user.email ?? '').trim().toLowerCase();
      const nextEmail = email.trim().toLowerCase();
      if (nextEmail === currentEmail) {
        setNotice('Profile saved');
        return;
      }
      const emailChange = await updateEmail(email);
      setNotice(
        emailChange === 'confirm'
          ? 'Profile saved. Confirm the new email from your inbox before it changes.'
          : 'Profile saved',
      );
    } catch (caught) {
      setError(toFriendlyError(caught));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'Your profile, shop, products, and chats are removed. Past orders stay, without your account name.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void removeAccount() },
      ],
    );
  }

  async function removeAccount() {
    setError(null);
    setNotice(null);
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
    } catch (caught) {
      setError(toFriendlyError(caught));
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;
  const displayName = name.trim() || 'Your profile';

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={typography.h1}>
          Settings
        </Text>
      </View>

      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={name} onPress={busy ? undefined : () => void choosePhoto()} size="lg" uri={photoUri} />
          <Text style={typography.h2}>{displayName}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change photo"
            disabled={busy}
            onPress={() => void choosePhoto()}
          >
            <Text style={[typography.button, { color: colors.primaryInk }]}>Change photo</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text style={typography.eyebrow}>Appearance</Text>
        <Card>
          <Text style={typography.bodyMedium}>Theme</Text>
          <Text style={typography.caption}>Dark stays the default. White switches the app to a light look.</Text>
          <SegmentedControl
            onChange={setMode}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'White' },
            ]}
            value={mode}
          />
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={typography.eyebrow}>Profile</Text>
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          label="Name"
          onChangeText={edit(setName)}
          value={name}
        />
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          helper="Used to sign in."
          keyboardType="email-address"
          label="Email"
          onChangeText={edit(setEmail)}
          textContentType="emailAddress"
          value={email}
        />
        <TextField
          autoComplete="tel"
          keyboardType="phone-pad"
          label="Phone"
          onChangeText={edit(setPhone)}
          value={phone}
        />
        <CampusChoices onChange={edit(setCampus)} value={campus} />
        {notice ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon color="primaryInk" name={notice.includes('inbox') ? 'mail' : 'check'} size={icon.sm} />
            <Text style={[typography.bodyMedium, { color: colors.primaryInk, flex: 1 }]}>{notice}</Text>
          </View>
        ) : null}
        {error ? <InlineError message={error} /> : null}
        <Button disabled={deleting} label="Save profile" loading={saving} onPress={() => void save()} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={typography.eyebrow}>Account</Text>
        <Text style={typography.bodySmall}>
          Deleting removes your profile, shop, products, and chats. Past orders stay, without your name.
        </Text>
        <Button
          disabled={saving}
          label="Delete account"
          loading={deleting}
          onPress={confirmDelete}
          variant="dangerOutline"
        />
      </View>
    </Screen>
  );
}
