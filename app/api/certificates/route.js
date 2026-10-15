import { list } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { readPrivateJson } from '@/lib/private-blob';
import { requireApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const result = await list({ prefix:'certificate-records/', limit:100, ...blobAuth() });
    const records = await Promise.all(result.blobs.map(async (blob) => {
      try {
        const record = await readPrivateJson(blob.pathname);
        if (!record) return null;
        return {
          ...record,
          certificateUrl: undefined,
          downloadUrl: `/api/certificates/${encodeURIComponent(record.submissionId)}/download`
        };
      } catch {
        return null;
      }
    }));
    return Response.json({
      certificates: records
        .filter(Boolean)
        .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    });
  } catch (error) {
    return Response.json({ error:error.message, certificates:[] }, { status:500 });
  }
}
