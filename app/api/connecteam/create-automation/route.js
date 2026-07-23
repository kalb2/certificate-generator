import { connecteamFetch } from '@/lib/connecteam';
import { encodeConfig } from '@/lib/config-token';
import { put } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const blobToken = getBlobToken();
    const { apiKey, formId, formName, mapping, logoUrl } = await request.json();
    const origin = new URL(request.url).origin;
    const config = { formId: Number(formId), formName, mapping, logoUrl: logoUrl || '' };
    const token = encodeConfig(config);
    const webhookUrl = `${origin}/api/connecteam/webhook?config=${encodeURIComponent(token)}`;
    let created = null;
    let warning = null;
    try {
      created = await connecteamFetch('/settings/v1/webhooks', apiKey, {
        method: 'POST',
        body: JSON.stringify({
          name: `Certificate - ${formName}`,
          url: webhookUrl,
          featureType: 'forms',
          entityId: String(formId),
          eventTypes: ['form_submission'],
          isDisabled: false
        })
      });
    } catch (error) {
      warning = `The app could not create the webhook automatically: ${error.message}`;
    }

    const setup = {
      formId: Number(formId),
      formName,
      mapping,
      logoUrl: logoUrl || '',
      webhookUrl,
      webhookCreatedAutomatically: Boolean(created),
      createdAt: new Date().toISOString(),
      active: true
    };
    await put('app-config/active-automation.json', JSON.stringify(setup), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
      token: blobToken
    });

    return Response.json({ webhookUrl, created: Boolean(created), webhook: created, warning, setup });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
