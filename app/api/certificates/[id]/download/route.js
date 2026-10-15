import { requireApiAuth } from '@/lib/auth';
import { getPrivateBlob, readPrivateJson } from '@/lib/private-blob';

export const runtime = 'nodejs';

function safeFilename(value) {
  return String(value || 'certificate').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'certificate';
}

export async function GET(request, context) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const submissionId = String(id || '');
    if (!submissionId || submissionId.includes('/') || submissionId.includes('..')) {
      return Response.json({ error: 'Invalid certificate ID.' }, { status: 400 });
    }

    const record = await readPrivateJson(`certificate-records/${submissionId}.json`);
    if (!record) return Response.json({ error: 'Certificate not found.' }, { status: 404 });
    if (!record.certificatePath) {
      return Response.json({ error: 'This certificate was created before private storage was enabled.' }, { status: 410 });
    }

    const result = await getPrivateBlob(record.certificatePath);
    if (!result) return Response.json({ error: 'Certificate file not found.' }, { status: 404 });

    const filename = `${safeFilename(`${record.firstName || ''}-${record.lastName || ''}-certificate`)}.pdf`;
    return new Response(result.stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
