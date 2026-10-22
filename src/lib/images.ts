import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { limits } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export const imageBuckets = ['product-images', 'shop-logos', 'avatars'] as const;
export type ImageBucket = (typeof imageBuckets)[number];
export type ImageKind = 'product' | 'logo';

const photoDenied = 'Photo access is needed so you can add pictures of your products and shop.';
const photoUnreadable = 'That photo could not be read. Try another image.';
const photoTooLarge = 'That photo is too large. Use a smaller image.';

export async function pickImages(max: number): Promise<string[]> {
  if (max < 1) throw new Error('Choose at least one photo.');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(photoDenied);

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: max > 1,
    selectionLimit: max,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => asset.uri).slice(0, max);
}

export async function compressImage(uri: string, kind: ImageKind): Promise<string> {
  const width = kind === 'product' ? limits.productImageWidth : limits.logoImageWidth;
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: limits.jpegQuality,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

export async function uploadImage(bucket: ImageBucket, userId: string, uri: string): Promise<string> {
  const bytes = await readImageBytes(uri);
  if (bytes.byteLength > limits.maxImageBytes) throw new Error(photoTooLarge);

  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function getImageUrl(bucket: ImageBucket, pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl || pathOrUrl.trim() === '') return null;
  if (/^https?:\/\//i.test(pathOrUrl) && !pathOrUrl.includes(`/${bucket}/`)) return pathOrUrl;

  const path = objectPath(bucket, pathOrUrl);
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function objectPath(bucket: ImageBucket, pathOrUrl: string): string {
  const marker = `/${bucket}/`;
  const at = pathOrUrl.indexOf(marker);
  const raw = at >= 0 ? pathOrUrl.slice(at + marker.length) : pathOrUrl.replace(/^\/+/, '');
  return raw.split('?')[0] ?? '';
}

async function readImageBytes(uri: string): Promise<ArrayBuffer> {
  if (/^https?:\/\//i.test(uri) || uri.startsWith('blob:') || uri.startsWith('data:')) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(photoUnreadable);
    return nonempty(await response.arrayBuffer());
  }
  return nonempty(await new File(uri).arrayBuffer());
}

function nonempty(bytes: ArrayBuffer): ArrayBuffer {
  if (bytes.byteLength === 0) throw new Error(photoUnreadable);
  return bytes;
}
