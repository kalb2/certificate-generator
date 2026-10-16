import { connecteamFetch, normalizeForms } from '@/lib/connecteam';
import { requireApiAuth } from '@/lib/auth';

function deployedApiKey() {
  return String(process.env.CONNECTEAM_API_KEY || '').trim();
}

export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const apiKey = deployedApiKey();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this Vercel deployment.');
    const payload = await connecteamFetch('/forms/v1/forms?limit=300&offset=0', apiKey);
    return Response.json({ forms: normalizeForms(payload) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
