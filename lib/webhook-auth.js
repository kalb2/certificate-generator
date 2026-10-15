import { createHmac, timingSafeEqual } from 'node:crypto';

function apiKey() {
  return String(process.env.CONNECTEAM_API_KEY || '').trim();
}

export function getWebhookToken() {
  const key = apiKey();
  if (!key) throw new Error('CONNECTEAM_API_KEY is required to secure the webhook.');
  return createHmac('sha256', key).update('connecteam-certificate-webhook-v1').digest('hex');
}

export function verifyWebhookToken(value) {
  try {
    const expected = Buffer.from(getWebhookToken());
    const supplied = Buffer.from(String(value || ''));
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}
