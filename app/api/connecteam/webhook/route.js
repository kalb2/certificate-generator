import { put, list } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';
import { answerById, answerValue, signatureUrl } from '@/lib/answers';
import { buildCertificate } from '@/lib/pdf';
import { findCertificateChat, sendCertificateChatMessage } from '@/lib/chat';
import { uploadPdfToConnecteam } from '@/lib/connecteam-files';

export const runtime = 'nodejs';

function safeName(value) {
  return String(value || 'certificate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,60) || 'certificate';
}

export async function POST(request) {
  try {
    const blobToken = getBlobToken();
    let config;
    {
      const saved = await list({ prefix:'app-config/active-automation.json', limit:1, token: blobToken });
      const blob = saved.blobs.find((b)=>b.pathname==='app-config/active-automation.json') || saved.blobs[0];
      if (!blob) throw new Error('Missing saved automation configuration. Go to setup and save the automation first.');
      config = await (await fetch(blob.url,{cache:'no-store'})).json();
    }
    console.log('[config] loaded', { formId: config.formId, hasLogo: Boolean(config.logoUrl) });
    const body = await request.json();
    if (body.eventType !== 'form_submission') return Response.json({ ignored:true });
    if (Number(body.data?.formId) !== Number(config.formId)) return Response.json({ ignored:true, reason:'Different form' });

    const answers = body.data?.answers || [];
    const firstName = answerValue(answerById(answers, config.mapping.firstName));
    const lastName = answerValue(answerById(answers, config.mapping.lastName));
    const courseName = answerValue(answerById(answers, config.mapping.courseName)) || config.formName;
    const completionAnswer = answerById(answers, config.mapping.completionDate);
    const completionDate = answerValue(completionAnswer) || new Date(Number(body.data.submissionTimestamp) * 1000).toLocaleDateString('en-US');
    const signature = signatureUrl(answerById(answers, config.mapping.signature));

    console.log('[1] Building certificate', { hasLogo: Boolean(config.logoUrl), hasSignature: Boolean(signature) });
    const bytes = await buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl: config.logoUrl || '' });
    console.log('[2] PDF generated', { size: bytes.length });
    const submissionId = String(body.data.formSubmissionId || body.requestId || Date.now());
    const pathname = `certificates/${safeName(firstName)}-${safeName(lastName)}-${safeName(courseName)}-${submissionId}.pdf`;
    console.log('[3] Uploading certificate to Blob');
    const blob = await put(pathname, bytes, { access:'public', contentType:'application/pdf', addRandomSuffix:true, token: blobToken });
    console.log('[4] Blob uploaded', blob.url);
    let connecteamFileId = null;
    if (process.env.CONNECTEAM_API_KEY && process.env.CONNECTEAM_SENDER_ID) {
      console.log('[5] Uploading PDF to Connecteam');
      connecteamFileId = await uploadPdfToConnecteam({ apiKey: process.env.CONNECTEAM_API_KEY, bytes, fileName: "certificate.pdf"});
      console.log('[6] Connecteam file uploaded', connecteamFileId);
    }
    // Optional Connecteam chat delivery
    if (process.env.CONNECTEAM_API_KEY && process.env.CONNECTEAM_SENDER_ID) {
      try {
        console.log('[7] Finding Certificates Automation chat');
        const chat = await findCertificateChat(process.env.CONNECTEAM_API_KEY);
        console.log('[8] Chat found', chat?.id || 'not found');
        if (chat?.id) {
          console.log('[9] Sending chat message');
          await sendCertificateChatMessage({
            apiKey: process.env.CONNECTEAM_API_KEY,
            conversationId: chat.id,
            senderId: process.env.CONNECTEAM_SENDER_ID,
            employeeName: `${firstName} ${lastName}`.trim(),
            courseName,
            fileId: connecteamFileId,
          });
          console.log('[10] Chat message sent');
        }
      } catch (chatError) {
        console.error('Certificate chat delivery failed:', chatError.message);
      }
    }

    const metadata = {
      submissionId,
      formId: config.formId,
      formName: config.formName,
      submittingUserId: body.data.submittingUserId,
      firstName, lastName, courseName, completionDate,
      certificateUrl: blob.url,
      signatureIncluded: Boolean(signature),
      logoIncluded: Boolean(config.logoUrl),
      createdAt: new Date().toISOString()
    };
    await put(`certificate-records/${submissionId}.json`, JSON.stringify(metadata), { access:'public', contentType:'application/json', allowOverwrite:true, token: blobToken });
    return Response.json({ success:true, certificateUrl:blob.url });
  } catch (error) {
    console.error('Certificate webhook failed', error);
    return Response.json({ success:false, error:error.message }, { status:500 });
  }
}
