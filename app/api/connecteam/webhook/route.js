import { put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { answerById, answerValue, signatureUrl } from '@/lib/answers';
import { buildCertificate } from '@/lib/pdf';
import { findCertificateChat, sendCertificateChatMessage } from '@/lib/chat';
import { uploadPdfToConnecteam } from '@/lib/connecteam-files';
import { readPrivateBytes, readPrivateJson } from '@/lib/private-blob';
import { verifyWebhookToken } from '@/lib/webhook-auth';

export const runtime = 'nodejs';

function safeName(value) {
  return String(value || 'certificate').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,60) || 'certificate';
}

async function loadConfig() {
  const config = await readPrivateJson('app-config/active-automation.json');
  if (!config) throw new Error('No saved automation config found');
  return config;
}

async function recordWebhookDelivery(body) {
  await put('app-config/webhook-health.json', JSON.stringify({
    receivedAt: new Date().toISOString(),
    requestId: String(body.requestId || ''),
    eventType: String(body.eventType || ''),
    formId: Number(body.data?.formId || 0)
  }), {
    access:'private',
    contentType:'application/json',
    allowOverwrite:true,
    addRandomSuffix:false,
    ...blobAuth()
  });
}

export async function POST(request) {
  try {
    const suppliedSecret = request.headers.get('x-webhook-secret');
    const legacyToken = new URL(request.url).searchParams.get('token');
    if (!verifyWebhookToken(suppliedSecret || legacyToken)) {
      return Response.json({ error:'Unauthorized webhook' }, { status:401 });
    }

    console.log('[0] Webhook received');
    const config = await loadConfig();
    console.log('[1] Config loaded', { formId: config.formId, hasLogo: !!(config.logoPath || config.logoUrl) });

    const body = await request.json();
    console.log('[2] Payload received', { eventType: body.eventType, formId: body.data?.formId });

    if (body.eventType !== 'form_submission') return Response.json({ ignored: true });
    if (Number(body.data?.formId) !== Number(config.formId)) return Response.json({ ignored: true, reason: 'Different form' });

    await recordWebhookDelivery(body);

    const answers = body.data?.answers || [];
    const firstName = answerValue(answerById(answers, config.mapping.firstName));
    const lastName = answerValue(answerById(answers, config.mapping.lastName));
    const courseName = answerValue(answerById(answers, config.mapping.courseName)) || config.formName;
    const completionDate = answerValue(answerById(answers, config.mapping.completionDate)) || new Date(Number(body.data.submissionTimestamp) * 1000).toLocaleDateString('en-US');
    const signature = signatureUrl(answerById(answers, config.mapping.signature));
    const logoBytes = config.logoPath ? await readPrivateBytes(config.logoPath) : null;

    console.log('[3] Building PDF', { firstName, lastName, hasLogo: !!(logoBytes?.length || config.logoUrl), hasSignature: !!signature });
    const bytes = await buildCertificate({
      firstName,
      lastName,
      courseName,
      completionDate,
      signature,
      logoUrl: config.logoUrl || '',
      logoBytes,
      pdfOptions: config.pdfOptions || {}
    });
    console.log('[4] PDF generated', { bytes: bytes.length });

    const submissionId = String(body.data.formSubmissionId || Date.now());
    const certificatePath = `certificates/${safeName(firstName)}-${submissionId}.pdf`;
    const blob = await put(certificatePath, bytes, {
      access:'private',
      contentType:'application/pdf',
      addRandomSuffix:true,
      ...blobAuth()
    });
    console.log('[5] Private Blob uploaded', blob.pathname);

    if (!process.env.CONNECTEAM_API_KEY || !process.env.CONNECTEAM_SENDER_ID) {
      console.log('[6] Missing Connecteam chat credentials');
    } else {
      console.log('[6] Uploading file to Connecteam');
      const fileId = await uploadPdfToConnecteam({ apiKey: process.env.CONNECTEAM_API_KEY, bytes, fileName: 'certificate.pdf' });
      console.log('[7] Connecteam file ready', fileId);
      const chat = await findCertificateChat(process.env.CONNECTEAM_API_KEY);
      console.log('[8] Chat lookup', chat?.id || 'not found');
      if (chat?.id) {
        await sendCertificateChatMessage({
          apiKey: process.env.CONNECTEAM_API_KEY,
          conversationId: chat.id,
          senderId: process.env.CONNECTEAM_SENDER_ID,
          employeeName: `${firstName} ${lastName}`.trim(),
          courseName,
          fileId
        });
        console.log('[9] Chat sent');
      }
    }

    const record = {
      submissionId,
      firstName,
      lastName,
      courseName,
      completionDate,
      certificatePath: blob.pathname,
      createdAt: new Date().toISOString()
    };
    await put(`certificate-records/${submissionId}.json`, JSON.stringify(record), {
      access:'private',
      contentType:'application/json',
      allowOverwrite:true,
      ...blobAuth()
    });
    return Response.json({ success:true });
  } catch (error) {
    console.error('Certificate webhook failed', error);
    return Response.json({ success:false, error: error.message }, { status:500 });
  }
}
