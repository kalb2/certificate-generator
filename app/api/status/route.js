import { list } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  const hasStaticToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidcStore = Boolean(process.env.BLOB_STORE_ID);
  const credentialMode = hasStaticToken ? 'static-token' : hasOidcStore ? 'oidc' : 'none';

  if (!hasStaticToken && !hasOidcStore) {
    return Response.json({
      storageReady: false,
      verified: false,
      credentialMode,
      message: 'No Vercel Blob store is connected to this deployment.'
    });
  }

  try {
    await list({ limit: 1 });
    return Response.json({ storageReady: true, verified: true, credentialMode });
  } catch (error) {
    // Modern Vercel Blob connections use BLOB_STORE_ID + a short-lived
    // runtime OIDC token. The token may not be visible as a normal project
    // environment variable, so BLOB_STORE_ID is the durable connection signal.
    return Response.json({
      storageReady: true,
      verified: false,
      credentialMode,
      warning: error?.message || 'Blob credentials were detected but the verification request failed.'
    });
  }
}
