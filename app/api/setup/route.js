import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';

const PATH = 'app-config/active-automation.json';

export async function GET() {
  try {
    const result = await list({ prefix: PATH, limit: 1 });
    const blob = result.blobs.find((item) => item.pathname === PATH) || result.blobs[0];
    if (!blob) return Response.json({ setup: null });
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Saved setup could not be read.');
    return Response.json({ setup: await response.json() });
  } catch (error) {
    return Response.json({ setup: null, error: error.message }, { status: 200 });
  }
}

export async function PUT(request) {
  try {
    const setup = await request.json();
    await put(PATH, JSON.stringify(setup), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false
    });
    return Response.json({ success: true, setup });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
