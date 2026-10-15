export function blobAuth() {
  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  return token ? { token } : {};
}
