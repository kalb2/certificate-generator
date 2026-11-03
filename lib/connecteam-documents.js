import { connecteamFetch } from '@/lib/connecteam';

function oneYearAfter(timestamp) {
  const issued = new Date(Number(timestamp) * 1000);
  if (!Number.isFinite(issued.getTime())) return undefined;
  issued.setUTCFullYear(issued.getUTCFullYear() + 1);
  return Math.floor(issued.getTime() / 1000);
}

export async function uploadPdfToEmployeeDocument({ apiKey, userId, documentId, bytes, fileName, issuedAt, showExpiryNotice }) {
  const documentResponse = await connecteamFetch(`/documents/v1/documents?documentIds=${Number(documentId)}`, apiKey);
  const documentData = documentResponse.data || documentResponse;
  const documents = documentData.documents || [];
  const document = documents.find((item) => Number(item.documentId ?? item.id) === Number(documentId));
  if (!document) throw new Error(`Connecteam document ${documentId} was not found or is not accessible.`);
  if (document.documentType !== 'document') throw new Error('Only standard upload documents can receive generated certificates.');

  const generated = await connecteamFetch('/attachments/v1/files/generate-upload-url', apiKey, {
    method: 'POST',
    body: JSON.stringify({ fileName, fileTypeHint: 'application/pdf', featureType: 'documents' })
  });
  const uploadData = generated.data || generated;
  const fileId = uploadData.fileId;
  const uploadFileUrl = uploadData.uploadFileUrl;
  if (!fileId || !uploadFileUrl) throw new Error('Connecteam did not return a document upload URL.');

  const upload = await fetch(uploadFileUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: bytes
  });
  if (!upload.ok) throw new Error(`Document file upload failed (${upload.status}).`);

  await connecteamFetch(`/attachments/v1/files/complete-upload/${fileId}`, apiKey, { method: 'PUT' });
  const expiresAt = showExpiryNotice && document.expiration?.type === 'entry'
    ? oneYearAfter(issuedAt)
    : undefined;
  const entry = await connecteamFetch(`/documents/v1/users/${Number(userId)}/documents/${Number(documentId)}/entry`, apiKey, {
    method: 'PUT',
    body: JSON.stringify({ fileIds: [fileId], ...(expiresAt ? { expiresAt } : {}) })
  });
  return entry.data || entry;
}
