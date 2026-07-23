import { list } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const token = getBlobToken();
    await list({ limit: 1, token });
    return Response.json({
      storageReady: true,
      verified: true,
      credentialMode: 'static-token',
      message: 'Vercel Blob is connected with BLOB_READ_WRITE_TOKEN.'
    });
  } catch (error) {
    return Response.json({
      storageReady: false,
      verified: false,
      credentialMode: 'none',
      message: error?.message || 'Vercel Blob could not be verified.'
    });
  }
}
