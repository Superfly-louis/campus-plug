// Same rule as public.storage_object_path: a relative path, or the part after /<bucket>/.
export function storageObjectPath(bucket: string, stored: string | null): string | null {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;

  const marker = `/${bucket}/`;
  const markerAt = trimmed.indexOf(marker);
  let objectPath: string;
  if (markerAt >= 0) {
    objectPath = trimmed.slice(markerAt + marker.length);
  } else if (/^https?:\/\//i.test(trimmed)) {
    return null;
  } else {
    objectPath = trimmed.replace(/^\/+/, '');
  }

  objectPath = objectPath.split('?')[0];
  return objectPath || null;
}

export function isStorageNotFound(error: { message?: string; statusCode?: string | number }): boolean {
  const message = `${error.message ?? ''} ${error.statusCode ?? ''}`.toLowerCase();
  return message.includes('not found') || message.includes('404');
}
