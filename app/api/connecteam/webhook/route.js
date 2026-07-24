import { put } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';
import { decodeConfig } from '@/lib/config-token';
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
    const config = decodeConfig(new URL(request.url).searchParams.get('config'));
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

    const bytes = await buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl: config.logoUrl || '' });
    const submissionId = String(body.data.formSubmissionId || body.requestId || Date.now());
    const pathname = `certificates/${safeName(firstName)}-${safeName(lastName)}-${safeName(courseName)}-${submissionId}.pdf`;
    const blob = await put(pathname, bytes, { access:'public', contentType:'application/pdf', addRandomSuffix:false, token: blobToken });
    let connecteamFileId = null;
    if (process.env.CONNECTEAM_API_KEY && process.env.CONNECTEAM_SENDER_ID) {
      connecteamFileId = await uploadPdfToConnecteam({ apiKey: process.env.CONNECTEAM_API_KEY, bytes, fileName: "certificate.pdf"});
    }
    // Optional Connecteam chat delivery
    if (process.env.CONNECTEAM_API_KEY && process.env.CONNECTEAM_SENDER_ID) {
      try {
        const chat = await findCertificateChat(process.env.CONNECTEAM_API_KEY);
        if (chat?.id) {
          await sendCertificateChatMessage({
            apiKey: process.env.CONNECTEAM_API_KEY,
            conversationId: chat.id,
            senderId: process.env.CONNECTEAM_SENDER_ID,
            employeeName: `${firstName} ${lastName}`.trim(),
            courseName,
            fileId: connecteamFileId,
          });
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
