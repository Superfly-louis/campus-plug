import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing, typography } from '@/constants/theme';
import { deleteAccount } from '@/lib/api/notifications';
import { updateProfile } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { compressImage, getImageUrl, pickImages, uploadImage } from '@/lib/images';

export default function SettingsScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [campus, setCampus] = useState(profile?.campus_location ?? '');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoUri = localUri ?? getImageUrl('avatars', profile?.avatar_url);

  function edit(update: (value: string) => void) {
    return (value: string) => {
      setSaved(false);
      update(value);
    };
  }

  async function choosePhoto() {
    setError(null);
    setSaved(false);
    try {
      const [uri] = await pickImages(1);
      if (uri) setLocalUri(uri);
    } catch (caught) {
      setError(toFriendlyError(caught));
    }
  }

  async function save() {
    setError(null);
    setSaved(false);
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
      setSaved(true);
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
    setSaved(false);
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

  return (
    <Screen scroll>
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <Text style={typography.h1}>Settings</Text>
      <View style={{ alignItems: 'flex-start', gap: spacing.xs }}>
        <Avatar
          name={name}
          onPress={saving || deleting ? undefined : () => void choosePhoto()}
          size="lg"
          uri={photoUri}
        />
        <Text style={[typography.caption, { color: colors.lilac }]}>Change photo</Text>
      </View>
      <TextField
        autoCapitalize="words"
        autoComplete="name"
        label="Name"
        onChangeText={edit(setName)}
        value={name}
      />
      <TextField
        autoComplete="tel"
        keyboardType="phone-pad"
        label="Phone"
        onChangeText={edit(setPhone)}
        value={phone}
      />
      <TextField
        autoCapitalize="words"
        label="Campus"
        onChangeText={edit(setCampus)}
        placeholder="Hall, hostel, or area"
        value={campus}
      />
      {saved ? <Text style={[typography.body, { color: colors.success }]}>Profile saved.</Text> : null}
      {error ? <InlineError message={error} /> : null}
      <Button disabled={deleting} label="Save" loading={saving} onPress={() => void save()} />
      <Button
        disabled={saving}
        label="Delete account"
        loading={deleting}
        onPress={confirmDelete}
        variant="danger"
      />
    </Screen>
  );
}
