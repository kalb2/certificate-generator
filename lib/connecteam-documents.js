import { connecteamFetch } from '@/lib/connecteam';

export async function uploadPdfToEmployeeDocument({ apiKey, userId, documentId, bytes, fileName, expiresAt }) {
  const generated = await connecteamFetch('/attachments/v1/files/generate-upload-url', apiKey, {
    method:'POST',
    body:JSON.stringify({ fileName, fileTypeHint:'application/pdf', featureType:'documents' })
  });
  const uploadData = generated.data || generated;
  const fileId = uploadData.fileId;
  const uploadFileUrl = uploadData.uploadFileUrl;
  if (!fileId || !uploadFileUrl) throw new Error('Connecteam did not return a document upload URL.');
  const upload = await fetch(uploadFileUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:bytes});
  if (!upload.ok) throw new Error(`Document file upload failed (${upload.status}).`);
  await connecteamFetch(`/attachments/v1/files/complete-upload/${fileId}`,apiKey,{method:'PUT'});
  const entry = await connecteamFetch(`/documents/v1/users/${userId}/documents/${documentId}/entry`,apiKey,{
    method:'PUT',body:JSON.stringify({fileIds:[fileId],...(expiresAt ? {expiresAt} : {})})
  });
  return entry.data || entry;
}
