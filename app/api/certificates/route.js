import { list } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const token = getBlobToken();
    const result = await list({ prefix:'certificate-records/', limit:100, token });
    const records = await Promise.all(result.blobs.map(async (blob) => {
      try { return await (await fetch(blob.url, { cache:'no-store' })).json(); } catch { return null; }
    }));
    return Response.json({ certificates: records.filter(Boolean).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  } catch (error) {
    return Response.json({ error:error.message, certificates:[] }, { status:500 });
  }
}
