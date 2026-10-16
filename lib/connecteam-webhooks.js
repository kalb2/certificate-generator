import { connecteamFetch, findArray } from '@/lib/connecteam';

const WEBHOOK_NAME_PREFIX = 'Certificate Generator';

function normalizeWebhook(item) {
  if (!item || typeof item !== 'object') return null;
  const id = Number(item.id ?? item.webhookId);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    name: String(item.name || ''),
    url: String(item.url || ''),
    featureType: String(item.featureType || ''),
    entityId: item.entityId == null ? '' : String(item.entityId),
    objectId: item.objectId == null ? '' : String(item.objectId),
    eventTypes: Array.isArray(item.eventTypes) ? item.eventTypes.map(String) : [],
    isDisabled: Boolean(item.isDisabled),
    raw: item
  };
}

async function listFormWebhooks(apiKey) {
  const payload = await connecteamFetch('/settings/v1/webhooks?featureType=forms&limit=100&offset=0', apiKey);
  return findArray(payload, ['webhooks', 'items', 'data', 'results'])
    .map(normalizeWebhook)
    .filter(Boolean);
}

function matchesScope(webhook, formId) {
  const expected = String(formId);
  return webhook.entityId === expected || webhook.objectId === expected;
}

function isVerified(webhook, { formId, url }) {
  return Boolean(
    webhook &&
    webhook.url === url &&
    webhook.featureType === 'forms' &&
    matchesScope(webhook, formId) &&
    webhook.eventTypes.includes('form_submission') &&
    !webhook.isDisabled
  );
}

export async function provisionFormWebhook({ apiKey, formId, formName, url, secretKey }) {
  const desiredName = `${WEBHOOK_NAME_PREFIX} - ${formName || formId}`.slice(0, 120);
  const body = {
    name: desiredName,
    url,
    featureType: 'forms',
    entityId: String(formId),
    eventTypes: ['form_submission'],
    webhookVersion: 1,
    isDisabled: false,
    secretKey
  };

  const before = await listFormWebhooks(apiKey);
  const existing = before.find((item) =>
    item.name === desiredName ||
    (item.url === url && matchesScope(item, formId))
  );

  let webhookId = existing?.id || null;
  let action = 'created';

  if (existing) {
    await connecteamFetch(`/settings/v1/webhooks/${existing.id}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    action = 'updated';
  } else {
    const created = await connecteamFetch('/settings/v1/webhooks', apiKey, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    webhookId = Number(created?.id ?? created?.webhookId ?? created?.data?.id ?? created?.data?.webhookId) || null;
  }

  const after = await listFormWebhooks(apiKey);
  const verified = after.find((item) =>
    (webhookId ? item.id === webhookId : true) && isVerified(item, { formId, url })
  ) || after.find((item) => isVerified(item, { formId, url }));

  if (!verified) {
    throw new Error('Connecteam webhook creation returned successfully, but the webhook could not be verified afterward. Check that the API key has settings.read and settings.write access and that Webhooks are enabled for this Connecteam account.');
  }

  return {
    webhookId: verified.id,
    webhookName: verified.name,
    action,
    verified: true,
    url: verified.url,
    formId: String(formId),
    eventTypes: verified.eventTypes
  };
}

export async function verifyFormWebhook({ apiKey, webhookId, formId, url }) {
  const webhooks = await listFormWebhooks(apiKey);
  const match = webhooks.find((item) => Number(item.id) === Number(webhookId));
  return {
    verified: isVerified(match, { formId, url }),
    webhook: match || null
  };
}
