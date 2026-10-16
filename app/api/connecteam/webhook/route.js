import { answerById, answerValue, signatureUrl } from '@/lib/answers';
import { buildCertificate } from '@/lib/pdf';
import { findCertificateChat, sendCertificateChatMessage } from '@/lib/chat';
import { uploadPdfToConnecteam } from '@/lib/connecteam-files';
import { putAdaptive, readPrivateBytes, readPrivateJson } from '@/lib/private-blob';
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

async function recordWebhookSuccess(body, submissionId) {
  await putAdaptive('app-config/webhook-health.json', JSON.stringify({
    receivedAt: new Date().toISOString(),
    processedSuccessfully: true,
    requestId: String(body.requestId || ''),
    submissionId: String(submissionId || ''),
    eventType: String(body.eventType || ''),
    formId: Number(body.data?.formId || 0)
  }), {
    contentType:'application/json',
    allowOverwrite:true,
    addRandomSuffix:false
  });
}

export async function POST(request) {
  try {
    const suppliedSecret = request.headers.get('x-webhook-secret');
    const legacyToken = new URL(request.url).searchParams.get('token');
    if (!verifyWebhookToken(suppliedSecret || legacyToken)) {
      return Response.json({ error:'Unauthorized webhook' }, { status:401 });
    }

    const config = await loadConfig();
    const body = await request.json();

    if (body.eventType !== 'form_submission') return Response.json({ ignored: true });
    if (Number(body.data?.formId) !== Number(config.formId)) return Response.json({ ignored: true, reason: 'Different form' });

    const answers = body.data?.answers || [];
    const firstName = answerValue(answerById(answers, config.mapping.firstName));
    const lastName = answerValue(answerById(answers, config.mapping.lastName));
    const courseName = answerValue(answerById(answers, config.mapping.courseName)) || config.formName;
    const completionDate = answerValue(answerById(answers, config.mapping.completionDate)) || new Date(Number(body.data.submissionTimestamp) * 1000).toLocaleDateString('en-US');
    const signature = signatureUrl(answerById(answers, config.mapping.signature));
    const logoBytes = config.logoPath ? await readPrivateBytes(config.logoPath) : null;

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

    const submissionId = String(body.data.formSubmissionId || Date.now());
    const certificatePath = `certificates/${safeName(firstName)}-${submissionId}.pdf`;
    const blob = await putAdaptive(certificatePath, bytes, {
      contentType:'application/pdf',
      addRandomSuffix:true
    });

    if (process.env.CONNECTEAM_API_KEY && process.env.CONNECTEAM_SENDER_ID) {
      const fileId = await uploadPdfToConnecteam({ apiKey: process.env.CONNECTEAM_API_KEY, bytes, fileName: 'certificate.pdf' });
      const chat = await findCertificateChat(process.env.CONNECTEAM_API_KEY);
      if (chat?.id) {
        await sendCertificateChatMessage({
          apiKey: process.env.CONNECTEAM_API_KEY,
          conversationId: chat.id,
          senderId: process.env.CONNECTEAM_SENDER_ID,
          employeeName: `${firstName} ${lastName}`.trim(),
          courseName,
          fileId
        });
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
    await putAdaptive(`certificate-records/${submissionId}.json`, JSON.stringify(record), {
      contentType:'application/json',
      allowOverwrite:true
    });

    await recordWebhookSuccess(body, submissionId);
    return Response.json({ success:true });
  } catch (error) {
    console.error('Certificate webhook failed', error);
    return Response.json({ success:false, error: error.message }, { status:500 });
  }
}
