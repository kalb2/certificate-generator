import { connecteamFetch, findArray } from '@/lib/connecteam';
import { requireApiAuth } from '@/lib/auth';

export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const apiKey = String(process.env.CONNECTEAM_API_KEY || '').trim();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing.');
    const payload = await connecteamFetch('/documents/v1/documents?limit=300&offset=0', apiKey);
    const data = payload.data || payload;
    const documents = findArray(data, ['documents', 'items', 'results'])
      .map((item) => ({
        id: Number(item.documentId ?? item.id),
        name: String(item.name ?? item.title ?? 'Document'),
        documentType: String(item.documentType || ''),
        expirationType: String(item.expiration?.type || ''),
        isReviewRequired: Boolean(item.isReviewRequired)
      }))
      .filter((item) => Number.isFinite(item.id) && item.documentType === 'document');
    return Response.json({ documents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
