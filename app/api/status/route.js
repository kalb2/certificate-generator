import { requireApiAuth } from '@/lib/auth';
import { detectBlobAccess } from '@/lib/private-blob';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const access = await detectBlobAccess();
    return Response.json({
      storageReady: true,
      verified: true,
      access,
      message: `Vercel Blob storage is connected and writable (${access} access).`
    });
  } catch (error) {
    return Response.json({
      storageReady: false,
      verified: false,
      access: 'unknown',
      message: error?.message || 'Vercel Blob could not be verified.'
    });
  }
}
