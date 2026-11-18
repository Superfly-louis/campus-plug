import * as Crypto from 'expo-crypto';
import { Redirect, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ImagePickerGrid, type GalleryImage } from '@/components/marketplace/ImagePickerGrid';
import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import { StatusBanner } from '@/components/marketplace/StatusBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { categoryVisual } from '@/constants/categories';
import { colors, layout, limits, priceFractionDigits, radius, spacing, typography } from '@/constants/theme';
import { queryKeys } from '@/hooks/queries/keys';
import { useCategories } from '@/hooks/queries/useCategories';
import { useProduct } from '@/hooks/queries/useProducts';
import {
  addProductImage,
  createProduct,
  deleteProduct,
  removeProductImage,
  updateProduct,
  type ProductDetail,
  type UpdateProductInput,
} from '@/lib/api/products';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { compressImage, getImageUrl, pickImages, uploadImage } from '@/lib/images';
import {
  categoryIdSchema,
  fieldError,
  productDescriptionSchema,
  productPriceSchema,
  productTitleSchema,
} from '@/lib/validation';

type DraftImage = GalleryImage & {
  remoteId?: string;
  position?: number;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  inStock: boolean;
  visible: boolean;
  images: DraftImage[];
};

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function priceInput(amount: number): string {
  return amount.toFixed(priceFractionDigits).replace(/\.0+$/, '');
}

function blankForm(): FormState {
  return {
    title: '',
    description: '',
    price: '',
    categoryId: '',
    inStock: true,
    visible: true,
    images: [],
  };
}

function toForm(detail: ProductDetail): FormState {
  return {
    title: detail.product.title,
    description: detail.product.description ?? '',
    price: priceInput(detail.product.price),
    categoryId: detail.product.category_id ?? '',
    inStock: detail.product.is_available,
    visible: detail.product.status === 'active',
    images: detail.images.flatMap((image) => {
      const uri = getImageUrl('product-images', image.storage_path);
      if (!uri) return [];
      return [{ id: image.id, uri, remoteId: image.id, position: image.position }];
    }),
  };
}

function isDirty(form: FormState, baseline: FormState): boolean {
  if (form.title !== baseline.title || form.description !== baseline.description) return true;
  if (form.price !== baseline.price || form.categoryId !== baseline.categoryId) return true;
  if (form.inStock !== baseline.inStock || form.visible !== baseline.visible) return true;
  if (form.images.length !== baseline.images.length) return true;
  return form.images.some((image, index) => image.id !== baseline.images[index]?.id);
}

function nextPosition(images: readonly DraftImage[]): number {
  return images.reduce((max, image) => (image.position == null ? max : Math.max(max, image.position)), -1) + 1;
}

export default function ProductFormScreen() {
  const { vendor, session } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = param(params.id);
  const product = useProduct(productId);

  if (!vendor || !session?.user.id) return <Redirect href="/vendor/apply" />;
  if (vendor.status !== 'approved') return <Redirect href="/my-shop" />;

  if (productId && product.isPending) {
    return (
      <Screen>
        <MarketplaceState status="loading" />
      </Screen>
    );
  }
  if (productId && product.isError) {
    return (
      <Screen>
        <MarketplaceState
          message={toFriendlyError(product.error)}
          onRetry={() => {
            void product.refetch();
          }}
          status="error"
        />
      </Screen>
    );
  }
  if (productId && !product.data) {
    return (
      <Screen>
        <MarketplaceState
          actionLabel="Go back"
          body="It may have been hidden or removed."
          icon="package"
          onAction={() => router.back()}
          status="empty"
          title="This product isn't available"
        />
      </Screen>
    );
  }
  if (product.data && product.data.product.vendor_id !== vendor.id) {
    return (
      <Screen>
        <MarketplaceState
          actionLabel="Go back"
          body="Open your own listings from My Shop."
          icon="package"
          onAction={() => router.back()}
          status="empty"
          title="This is not your listing"
        />
      </Screen>
    );
  }

  return (
    <ProductEditor
      detail={product.data ?? null}
      key={product.data?.product.id ?? 'new'}
      userId={session.user.id}
      vendorId={vendor.id}
    />
  );
}

function ProductEditor({
  vendorId,
  userId,
  detail,
}: {
  vendorId: string;
  userId: string;
  detail: ProductDetail | null;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const initial = detail ? toForm(detail) : blankForm();
  const [form, setForm] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const savingRef = useRef(false);
  const pickingRef = useRef(false);
  const leave = useRef(false);
  const locked = detail?.product.status === 'removed_by_admin';
  const dirty = isDirty(form, baseline);
  const busy = saving || picking;
  const titleError = tried ? fieldError(productTitleSchema, form.title) : null;
  const descriptionError = tried ? fieldError(productDescriptionSchema, form.description) : null;
  const priceError = tried ? fieldError(productPriceSchema, form.price) : null;
  const categoryError = tried ? fieldError(categoryIdSchema, form.categoryId) : null;
  const imageError = tried && form.images.length < 1 ? 'Add at least one photo.' : null;
  const selected = categories.data?.find((category) => category.id === form.categoryId);
  const categoryLabel = selected ? categoryVisual(selected.slug, selected.name).label : 'Choose a category';

  useEffect(() => {
    const nav = navigation as unknown as {
      addListener: (
        type: 'beforeRemove',
        listener: (event: {
          preventDefault: () => void;
          data: { action: Parameters<typeof navigation.dispatch>[0] };
        }) => void,
      ) => () => void;
    };
    return nav.addListener('beforeRemove', (event) => {
      if (leave.current || (!saving && !dirty)) return;
      event.preventDefault();
      if (saving) {
        Alert.alert('Upload in progress', 'Wait until this listing finishes saving.');
        return;
      }
      Alert.alert('Leave without saving?', 'Your changes will be lost.', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            leave.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
  }, [dirty, navigation, saving]);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  }

  async function addPhotos() {
    if (busy || pickingRef.current) return;
    setError(null);
    pickingRef.current = true;
    setPicking(true);
    const added: DraftImage[] = [];
    try {
      const room = limits.maxProductImages - form.images.length;
      if (room < 1) return;
      const uris = await pickImages(room);
      for (const uri of uris) {
        const compressed = await compressImage(uri, 'product');
        added.push({ id: Crypto.randomUUID(), uri: compressed });
      }
    } catch (caught) {
      setError(toFriendlyError(caught));
    } finally {
      if (added.length > 0) {
        setForm((current) => ({
          ...current,
          images: [...current.images, ...added].slice(0, limits.maxProductImages),
        }));
      }
      setPicking(false);
      pickingRef.current = false;
    }
  }

  function removePhoto(id: string) {
    if (busy) return;
    setForm((current) => ({ ...current, images: current.images.filter((image) => image.id !== id) }));
  }

  async function save() {
    if (savingRef.current) return;
    setTried(true);
    setError(null);
    if (
      fieldError(productTitleSchema, form.title) ||
      fieldError(productDescriptionSchema, form.description) ||
      fieldError(productPriceSchema, form.price) ||
      fieldError(categoryIdSchema, form.categoryId) ||
      form.images.length < 1
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const snapshot = form;
    let changed = false;
    try {
      if (!detail) {
        await publish(snapshot, () => {
          changed = true;
        });
        return;
      }
      await saveEdits(snapshot, () => {
        changed = true;
      });
    } catch (caught) {
      setError(toFriendlyError(caught));
    } finally {
      if (changed) await invalidate();
      if (leave.current) return;
      savingRef.current = false;
      setSaving(false);
      setProgress(null);
    }
  }

  async function publish(snapshot: FormState, markChanged: () => void) {
    setProgress('Saving the listing');
    let createdId: string | null = null;
    let finished = false;
    try {
      const created = await createProduct({
        vendorId,
        title: snapshot.title,
        description: snapshot.description,
        price: snapshot.price,
        categoryId: snapshot.categoryId,
        isAvailable: snapshot.inStock,
        status: snapshot.visible ? 'active' : 'hidden',
      });
      createdId = created.id;
      markChanged();
      for (let index = 0; index < snapshot.images.length; index += 1) {
        const image = snapshot.images[index];
        if (!image) continue;
        const step = index + 1;
        const total = snapshot.images.length;
        setProgress(`Uploading photo ${step} of ${total}`);
        let storagePath: string;
        try {
          storagePath = await uploadImage('product-images', userId, image.uri);
        } catch (caught) {
          throw new Error(`Photo ${step} could not be uploaded. ${toFriendlyError(caught)}`);
        }
        setProgress(`Saving photo ${step} of ${total}`);
        try {
          await addProductImage({ productId: created.id, storagePath, position: index });
        } catch (caught) {
          throw new Error(`Photo ${step} could not be saved. ${toFriendlyError(caught)}`);
        }
      }
      finished = true;
      leave.current = true;
      router.back();
    } catch (caught) {
      if (finished) return;
      const reason = toFriendlyError(caught);
      if (!createdId) throw caught;
      try {
        await deleteProduct(createdId);
        setError(`${reason} The listing was removed so you can try again.`);
      } catch {
        setError(`${reason} The listing is still in My Shop. Delete it before you try again.`);
      }
    }
  }

  async function saveEdits(snapshot: FormState, markChanged: () => void) {
    if (!detail) return;
    const patchInput: UpdateProductInput = { id: detail.product.id };
    if (snapshot.title !== baseline.title) patchInput.title = snapshot.title;
    if (snapshot.description !== baseline.description) patchInput.description = snapshot.description;
    if (snapshot.price !== baseline.price) patchInput.price = snapshot.price;
    if (snapshot.categoryId !== baseline.categoryId) patchInput.categoryId = snapshot.categoryId;
    if (snapshot.inStock !== baseline.inStock) patchInput.isAvailable = snapshot.inStock;
    if (!locked && snapshot.visible !== baseline.visible) {
      patchInput.status = snapshot.visible ? 'active' : 'hidden';
    }
    const removed = baseline.images.filter(
      (image) => image.remoteId && !snapshot.images.some((item) => item.id === image.id),
    );
    const added = snapshot.images.filter((image) => !image.remoteId);

    if (Object.keys(patchInput).length > 1) {
      setProgress('Saving the listing');
      try {
        await updateProduct(patchInput);
      } catch (caught) {
        throw new Error(`The listing details could not be saved. ${toFriendlyError(caught)}`);
      }
      markChanged();
      setBaseline((current) => ({
        ...current,
        title: snapshot.title,
        description: snapshot.description,
        price: snapshot.price,
        categoryId: snapshot.categoryId,
        inStock: snapshot.inStock,
        visible: locked ? current.visible : snapshot.visible,
      }));
    }

    for (const image of removed) {
      if (!image.remoteId) continue;
      setProgress('Removing a photo');
      try {
        await removeProductImage(image.remoteId);
      } catch (caught) {
        throw new Error(`A photo could not be removed. ${toFriendlyError(caught)}`);
      }
      markChanged();
      setBaseline((current) => ({
        ...current,
        images: current.images.filter((item) => item.id !== image.id),
      }));
    }

    let position = nextPosition(snapshot.images);
    for (let index = 0; index < added.length; index += 1) {
      const image = added[index];
      if (!image) continue;
      const step = index + 1;
      setProgress(`Uploading photo ${step} of ${added.length}`);
      let storagePath: string;
      try {
        storagePath = await uploadImage('product-images', userId, image.uri);
      } catch (caught) {
        throw new Error(`Photo ${step} could not be uploaded. ${toFriendlyError(caught)}`);
      }
      setProgress(`Saving photo ${step} of ${added.length}`);
      let savedId: string;
      try {
        const row = await addProductImage({
          productId: detail.product.id,
          storagePath,
          position,
        });
        savedId = row.id;
      } catch (caught) {
        throw new Error(`Photo ${step} could not be saved. ${toFriendlyError(caught)}`);
      }
      markChanged();
      const saved: DraftImage = { ...image, remoteId: savedId, position };
      position += 1;
      setForm((current) => ({
        ...current,
        images: current.images.map((item) => (item.id === image.id ? saved : item)),
      }));
      setBaseline((current) => ({
        ...current,
        images: current.images.some((item) => item.id === saved.id) ? current.images : [...current.images, saved],
      }));
    }

    leave.current = true;
    router.back();
  }

  function confirmDelete() {
    if (!detail || savingRef.current) return;
    Alert.alert('Delete this product?', 'The listing and its photos will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void removeListing();
        },
      },
    ]);
  }

  async function removeListing() {
    if (!detail || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await deleteProduct(detail.product.id);
      await invalidate();
      leave.current = true;
      router.back();
    } catch (caught) {
      setError(toFriendlyError(caught));
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <Text style={typography.h1}>{detail ? 'Edit product' : 'Add a product'}</Text>
      {locked ? (
        <StatusBanner
          message={
            detail?.product.moderation_reason ??
            'An admin removed this listing, so buyers cannot see it.'
          }
          tone="danger"
        />
      ) : null}
      <ImagePickerGrid images={form.images} onAdd={() => void addPhotos()} onRemove={removePhoto} />
      <Text style={typography.bodySmall}>Add 1 to {limits.maxProductImages} photos. The first photo is the cover.</Text>
      {imageError ? <InlineError message={imageError} /> : null}
      <TextField
        autoCapitalize="sentences"
        editable={!busy}
        error={titleError ?? undefined}
        label="Title"
        onChangeText={(title) => patch({ title })}
        value={form.title}
      />
      <TextField
        editable={!busy}
        error={descriptionError ?? undefined}
        helper={`Optional. Up to ${limits.productDescriptionMax} characters.`}
        label="Description"
        multiline
        onChangeText={(description) => patch({ description })}
        value={form.description}
      />
      <TextField
        editable={!busy}
        error={priceError ?? undefined}
        helper={`Greater than 0, up to ${limits.productPriceMax}, in GHS.`}
        keyboardType="decimal-pad"
        label="Price"
        onChangeText={(price) => patch({ price })}
        value={form.price}
      />
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.bodyMedium}>Category</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={categoryLabel}
          disabled={busy}
          onPress={() => setCategoryOpen(true)}
          style={{
            minHeight: layout.minTouchTarget,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            borderWidth: layout.borderWidth,
            borderColor: categoryError ? colors.danger : colors.border,
            backgroundColor: colors.surfaceAlt,
            justifyContent: 'center',
          }}
        >
          <Text style={typography.body}>{categoryLabel}</Text>
        </Pressable>
        {categoryError ? <InlineError message={categoryError} /> : null}
        {categories.isError ? (
          <InlineError message={toFriendlyError(categories.error)} />
        ) : null}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={typography.body}>In stock</Text>
          <Switch
            accessibilityLabel="In stock"
            disabled={busy}
            onValueChange={(inStock) => patch({ inStock })}
            thumbColor={colors.textPrimary}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={form.inStock}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={typography.body}>Visible to buyers</Text>
          <Switch
            accessibilityLabel="Visible to buyers"
            disabled={busy || locked}
            onValueChange={(visible) => patch({ visible })}
            thumbColor={colors.textPrimary}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={form.visible}
          />
        </View>
      </Card>
      {progress ? <Text style={typography.body}>{progress}</Text> : null}
      {error ? <InlineError message={error} /> : null}
      <Button label={detail ? 'Save product' : 'Add product'} loading={saving} onPress={() => void save()} />
      {detail ? (
        <Button disabled={busy} label="Delete product" onPress={confirmDelete} variant="danger" />
      ) : null}
      <Modal animationType="fade" transparent visible={categoryOpen} onRequestClose={() => setCategoryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable accessibilityLabel="Close categories" onPress={() => setCategoryOpen(false)} style={{ flex: 1 }} />
          <View
            style={{
              maxHeight: '85%',
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={typography.h2}>Category</Text>
            {categories.isPending ? (
              <MarketplaceState status="loading" />
            ) : categories.isError ? (
              <MarketplaceState
                message={toFriendlyError(categories.error)}
                onRetry={() => {
                  void categories.refetch();
                }}
                status="error"
              />
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {(categories.data ?? []).map((category) => {
                  const visual = categoryVisual(category.slug, category.name);
                  return (
                    <Chip
                      active={form.categoryId === category.id}
                      key={category.id}
                      label={visual.label}
                      onPress={() => {
                        patch({ categoryId: category.id });
                        setCategoryOpen(false);
                      }}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
