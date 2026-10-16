import { requireApiAuth } from '@/lib/auth';
import { getAdaptiveBlob, putAdaptive } from '@/lib/private-blob';

export const runtime = 'nodejs';

export async function GET(request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const pathname = new URL(request.url).searchParams.get('path');
    if (!pathname || !pathname.startsWith('branding/')) {
      return Response.json({ error: 'Invalid logo path.' }, { status: 400 });
    }
    const wrapped = await getAdaptiveBlob(pathname);
    if (!wrapped) return Response.json({ error: 'Logo not found.' }, { status: 404 });
    const result = wrapped.result;
    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob?.contentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get('logo');
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Choose a logo file.');
    if (!String(file.type || '').startsWith('image/')) throw new Error('The logo must be an image.');
    if (Number(file.size || 0) > 5 * 1024 * 1024) throw new Error('The logo must be smaller than 5 MB.');
    const extension = String(file.name || 'logo.png').split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'png';
    const blob = await putAdaptive(`branding/company-logo.${extension}`, file, {
      contentType: file.type || 'application/octet-stream',
      allowOverwrite: true,
      addRandomSuffix: false
    });
    return Response.json({
      logoPath: blob.pathname,
      logoUrl: `/api/logo?path=${encodeURIComponent(blob.pathname)}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
