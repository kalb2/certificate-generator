export function getBlobToken() {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing. Add the read/write token for your existing Vercel Blob store in Project Settings > Environment Variables, then redeploy.');
  }
  return token;
}
