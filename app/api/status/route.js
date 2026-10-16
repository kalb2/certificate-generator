import { del, put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { requireApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const pathname = `app-config/private-access-check-${Date.now()}.txt`;

  try {
    const blob = await put(pathname, 'private access check', {
      access: 'private',
      contentType: 'text/plain',
      addRandomSuffix: false,
      ...blobAuth()
    });

    try {
      await del(blob.url, blobAuth());
    } catch (cleanupError) {
      console.warn('Private Blob status check cleanup failed:', cleanupError?.message || cleanupError);
    }

    return Response.json({
      storageReady: true,
      verified: true,
      access: 'private',
      message: 'Private Vercel Blob storage is connected and writable.'
    });
  } catch (error) {
    const message = error?.message || 'Vercel Blob could not be verified.';
    const publicStore = /private access on a public store/i.test(message);

    return Response.json({
      storageReady: false,
      verified: false,
      access: publicStore ? 'public' : 'unknown',
      message: publicStore
        ? 'A public Vercel Blob store is connected. Create a new Blob store with Private access, connect it to this project, then redeploy.'
        : message
    });
  }
}
