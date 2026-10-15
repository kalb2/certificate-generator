import { put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { readPrivateJson } from '@/lib/private-blob';
import { requireApiAuth } from '@/lib/auth';

export const runtime = 'nodejs';
const PATH = 'app-config/active-automation.json';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    return Response.json({ setup: await readPrivateJson(PATH) });
  } catch (error) {
    return Response.json({ setup: null, error: error.message }, { status: 200 });
  }
}

export async function PUT(request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const setup = await request.json();
    await put(PATH, JSON.stringify(setup), {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
      ...blobAuth()
    });
    return Response.json({ success: true, setup });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
