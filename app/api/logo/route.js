import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo');
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Choose a logo file.');
    if (!String(file.type || '').startsWith('image/')) throw new Error('The logo must be an image.');
    if (Number(file.size || 0) > 5 * 1024 * 1024) throw new Error('The logo must be smaller than 5 MB.');
    const extension = String(file.name || 'logo.png').split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'png';
    const blob = await put(`branding/company-logo.${extension}`, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      allowOverwrite: true,
      addRandomSuffix: false
    });
    return Response.json({ logoUrl: blob.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
