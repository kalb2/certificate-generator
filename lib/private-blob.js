import { get, list, put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';

function accessMismatch(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('cannot use private access on a public store') ||
    message.includes('cannot use public access on a private store') ||
    message.includes('store must be configured with private access') ||
    message.includes('store must be configured with public access');
}

async function findPublicBlob(pathname) {
  const result = await list({ prefix: pathname, limit: 100, ...blobAuth() });
  return result.blobs?.find((blob) => blob.pathname === pathname) || null;
}

export async function detectBlobAccess() {
  const probe = `app-config/storage-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  try {
    await put(probe, 'ok', { access: 'private', addRandomSuffix: false, ...blobAuth() });
    return 'private';
  } catch (error) {
    if (!accessMismatch(error)) throw error;
  }
  await put(probe, 'ok', { access: 'public', addRandomSuffix: false, ...blobAuth() });
  return 'public';
}

export async function putAdaptive(pathname, body, options = {}) {
  const base = { ...options, ...blobAuth() };
  try {
    return await put(pathname, body, { ...base, access: 'private' });
  } catch (error) {
    if (!accessMismatch(error)) throw error;
    return put(pathname, body, { ...base, access: 'public' });
  }
}

export async function getAdaptiveBlob(pathname) {
  try {
    const result = await get(pathname, { access: 'private', ...blobAuth() });
    if (result) return { access: 'private', result };
  } catch (error) {
    if (!accessMismatch(error)) throw error;
  }

  const blob = await findPublicBlob(pathname);
  if (!blob) return null;
  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) return null;
  return {
    access: 'public',
    result: {
      stream: response.body,
      blob: { ...blob, contentType: response.headers.get('content-type') || blob.contentType }
    }
  };
}

export async function getPrivateBlob(pathname) {
  const wrapped = await getAdaptiveBlob(pathname);
  return wrapped?.result || null;
}

export async function readPrivateJson(pathname) {
  const wrapped = await getAdaptiveBlob(pathname);
  if (!wrapped) return null;
  return new Response(wrapped.result.stream).json();
}

export async function readPrivateBytes(pathname) {
  const wrapped = await getAdaptiveBlob(pathname);
  if (!wrapped) return null;
  return Buffer.from(await new Response(wrapped.result.stream).arrayBuffer());
}
