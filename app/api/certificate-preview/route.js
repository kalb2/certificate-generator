import { requireApiAuth } from '@/lib/auth';
import { buildCertificate } from '@/lib/pdf';
import { readPrivateBytes } from '@/lib/private-blob';

export const runtime = 'nodejs';

export async function POST(request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const { logoPath, logoUrl, pdfOptions, courseName } = await request.json();
    const logoBytes = logoPath ? await readPrivateBytes(logoPath) : null;
    const bytes = await buildCertificate({
      firstName: 'Jane',
      lastName: 'Doe',
      courseName: courseName || 'Recognizing and Reporting Abuse, Neglect and Exploitation Training',
      completionDate: '10/07/2026',
      signature: '',
      logoUrl: logoPath ? '' : (logoUrl || ''),
      logoBytes,
      pdfOptions,
      preview: true
    });

    return new Response(bytes, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="certificate-preview.pdf"',
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
