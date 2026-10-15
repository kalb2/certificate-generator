import { list } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { requireApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    await list({ limit: 1, ...blobAuth() });
    return Response.json({
      storageReady: true,
      verified: true,
      message: 'Vercel Blob is connected. This app expects the connected store to be private.'
    });
  } catch (error) {
    return Response.json({
      storageReady: false,
      verified: false,
      message: error?.message || 'Vercel Blob could not be verified.'
    });
  }
}
