import { put, list } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';
import { answerById, answerValue, signatureUrl } from '@/lib/answers';
import { buildCertificate } from '@/lib/pdf';
import { findCertificateChat, sendCertificateChatMessage } from '@/lib/chat';
import { uploadPdfToConnecteam } from '@/lib/connecteam-files';

export const runtime = 'nodejs';

function safeName(value) {
  return String(value || 'certificate').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,60) || 'certificate';
}

async function loadConfig(token) {
  const result = await list({ prefix: 'app-config/', limit: 100, token });
  const configBlob = result.blobs.find((b) => b.pathname === 'app-config/active-automation.json');
  if (!configBlob) throw new Error('No saved automation config found');
  return fetch(configBlob.url, { cache: 'no-store' }).then(r => r.json());
}

export async function POST(request) {
  try {
    console.log('[0] Webhook received');
    const blobToken = getBlobToken();
    const config = await loadConfig(blobToken);
    console.log('[1] Config loaded', { formId: config.formId, hasLogo: !!config.logoUrl });

    const body = await request.json();
    console.log('[2] Payload received', { eventType: body.eventType, formId: body.data?.formId });

    if (body.eventType !== 'form_submission') return Response.json({ ignored: true });
    if (Number(body.data?.formId) !== Number(config.formId)) return Response.json({ ignored: true, reason: 'Different form' });

    const answers = body.data?.answers || [];
    const firstName = answerValue(answerById(answers, config.mapping.firstName));
    const lastName = answerValue(answerById(answers, config.mapping.lastName));
    const courseName = answerValue(answerById(answers, config.mapping.courseName)) || config.formName;
    const completionDate = answerValue(answerById(answers, config.mapping.completionDate)) || new Date(Number(body.data.submissionTimestamp) * 1000).toLocaleDateString('en-US');
    const signature = signatureUrl(answerById(answers, config.mapping.signature));

    console.log('[3] Building PDF', { firstName, lastName, hasLogo: !!config.logoUrl, hasSignature: !!signature });
    const bytes = await buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl: config.logoUrl || '' });
    console.log('[4] PDF generated', { bytes: bytes.length });

    const submissionId = String(body.data.formSubmissionId || Date.now());
    const blob = await put(`certificates/${safeName(firstName)}-${submissionId}.pdf`, bytes, { access:'public', contentType:'application/pdf', addRandomSuffix:true, token: blobToken });
    console.log('[5] Blob uploaded', blob.url);

    if (!process.env.CONNECTEAM_API_KEY || !process.env.CONNECTEAM_SENDER_ID) {
      console.log('[6] Missing Connecteam chat credentials');
    } else {
      console.log('[6] Uploading file to Connecteam');
      const fileId = await uploadPdfToConnecteam({ apiKey: process.env.CONNECTEAM_API_KEY, bytes, fileName: 'certificate.pdf' });
      console.log('[7] Connecteam file ready', fileId);
      const chat = await findCertificateChat(process.env.CONNECTEAM_API_KEY);
      console.log('[8] Chat lookup', chat?.id || 'not found');
      if (chat?.id) {
        await sendCertificateChatMessage({ apiKey: process.env.CONNECTEAM_API_KEY, conversationId: chat.id, senderId: process.env.CONNECTEAM_SENDER_ID, employeeName: `${firstName} ${lastName}`.trim(), courseName, fileId });
        console.log('[9] Chat sent');
      }
    }

    await put(`certificate-records/${submissionId}.json`, JSON.stringify({ submissionId, firstName, lastName, courseName, completionDate, certificateUrl: blob.url }), { access:'public', contentType:'application/json', allowOverwrite:true, token: blobToken });
    return Response.json({ success:true, certificateUrl: blob.url });
  } catch (error) {
    console.error('Certificate webhook failed', error);
    return Response.json({ success:false, error: error.message }, { status:500 });
  }
}
