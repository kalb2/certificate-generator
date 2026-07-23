import { connecteamFetch, normalizeForms } from '@/lib/connecteam';

export async function POST(request) {
  try {
    const { apiKey } = await request.json();
    const payload = await connecteamFetch('/forms/v1/forms?limit=300&offset=0', apiKey);
    return Response.json({ forms: normalizeForms(payload) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
