import { connecteamFetch, extractQuestions, detectMapping } from '@/lib/connecteam';
import { requireApiAuth } from '@/lib/auth';

function deployedApiKey() {
  return String(process.env.CONNECTEAM_API_KEY || '').trim();
}

export async function POST(request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const { formId } = await request.json();
    const normalizedFormId = Number(formId);
    if (!Number.isSafeInteger(normalizedFormId) || normalizedFormId <= 0) {
      throw new Error('A valid Connecteam form ID is required.');
    }
    const apiKey = deployedApiKey();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this Vercel deployment.');
    const payload = await connecteamFetch(`/forms/v1/forms/${normalizedFormId}`, apiKey);
    const questions = extractQuestions(payload);
    return Response.json({ questions, mapping: detectMapping(questions) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
