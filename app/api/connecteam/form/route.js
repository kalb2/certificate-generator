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
    const apiKey = deployedApiKey();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this Vercel deployment.');
    const payload = await connecteamFetch(`/forms/v1/forms/${Number(formId)}`, apiKey);
    const questions = extractQuestions(payload);
    return Response.json({ questions, mapping: detectMapping(questions) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
