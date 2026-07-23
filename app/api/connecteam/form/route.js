import { connecteamFetch, extractQuestions, detectMapping } from '@/lib/connecteam';

export async function POST(request) {
  try {
    const { apiKey, formId } = await request.json();
    const payload = await connecteamFetch(`/forms/v1/forms/${Number(formId)}`, apiKey);
    const questions = extractQuestions(payload);
    return Response.json({ questions, mapping: detectMapping(questions) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
