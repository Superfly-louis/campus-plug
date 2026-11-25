import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ShopLogoField } from '@/components/marketplace/ShopLogoField';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { limits, typography } from '@/constants/theme';
import { useUpdateShop } from '@/hooks/queries/useVendors';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { compressImage, getImageUrl, pickImages, uploadImage } from '@/lib/images';
import { fieldError, shopDescriptionSchema, shopNameSchema } from '@/lib/validation';
import { useThemeMode } from '@/lib/themeMode';

export default function EditShopScreen() {
  useThemeMode();
  const { vendor, session } = useAuth();
  const updateShop = useUpdateShop();
  const [shopName, setShopName] = useState(vendor?.shop_name ?? '');
  const [description, setDescription] = useState(vendor?.description ?? '');
  const [pickedLogo, setPickedLogo] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!vendor || vendor.status !== 'approved') return <Redirect href="/my-shop" />;

  const savedLogo = getImageUrl('shop-logos', vendor.logo_url);
  const nameError = tried ? fieldError(shopNameSchema, shopName) : null;
  const descriptionError = tried ? fieldError(shopDescriptionSchema, description) : null;
  const busy = picking || saving || updateShop.isPending;

  async function chooseLogo() {
    setError(null);
    setPicking(true);
    try {
      const uris = await pickImages(1);
      const uri = uris[0];
      if (!uri) return;
      setPickedLogo(await compressImage(uri, 'logo'));
    } catch (caught) {
      setError(toFriendlyError(caught));
    } finally {
      setPicking(false);
    }
  }

  async function save() {
    setTried(true);
    setError(null);
    if (fieldError(shopNameSchema, shopName) || fieldError(shopDescriptionSchema, description)) return;
    const userId = session?.user.id;
    if (!userId) {
      setError('Sign in again, then save your shop.');
      return;
    }
    setSaving(true);
    try {
      const logoUrl = pickedLogo ? await uploadImage('shop-logos', userId, pickedLogo) : undefined;
      await updateShop.mutateAsync({
        shopName,
        description,
        ...(logoUrl ? { logoUrl } : {}),
      });
      router.back();
    } catch (caught) {
      setSaving(false);
      setError(toFriendlyError(caught));
    }
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      </View>
      <Text style={typography.h1}>Edit shop</Text>
      <ShopLogoField disabled={busy} onPress={() => void chooseLogo()} uri={pickedLogo ?? savedLogo} />
      <TextField
        autoCapitalize="words"
        error={nameError ?? undefined}
        helper={`Use ${limits.shopNameMin} to ${limits.shopNameMax} characters.`}
        label="Shop name"
        onChangeText={setShopName}
        value={shopName}
      />
      <TextField
        error={descriptionError ?? undefined}
        helper={`Optional. Up to ${limits.shopDescriptionMax} characters.`}
        label="Description"
        multiline
        onChangeText={setDescription}
        value={description}
      />
      {error ? <InlineError message={error} /> : null}
      <Button label="Save shop" loading={busy} onPress={() => void save()} />
    </Screen>
  );
}
