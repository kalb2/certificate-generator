import { get } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';

export async function getPrivateBlob(pathname) {
  return get(pathname, { access: 'private', ...blobAuth() });
}

export async function readPrivateJson(pathname) {
  const result = await getPrivateBlob(pathname);
  if (!result) return null;
  return new Response(result.stream).json();
}

export async function readPrivateBytes(pathname) {
  const result = await getPrivateBlob(pathname);
  if (!result) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
