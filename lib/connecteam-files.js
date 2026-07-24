import { connecteamFetch } from '@/lib/connecteam';

export async function uploadPdfToConnecteam({ apiKey, bytes, fileName }) {
  const upload = await connecteamFetch('/attachments/v1/files/generate-upload-url', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      fileName,
      fileTypeHint: 'application/pdf',
      featureType: 'chat'
    })
  });

  const file = upload.data;
  if (!file?.uploadFileUrl || !file?.fileId) {
    throw new Error('Connecteam upload URL response missing fileId/uploadFileUrl');
  }

  const response = await fetch(file.uploadFileUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: Buffer.from(bytes)
  });

  if (!response.ok) {
    throw new Error(`Connecteam file upload failed: ${response.status}`);
  }

  return file.fileId;
}
