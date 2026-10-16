import { requireApiAuth } from '@/lib/auth';
import { readPrivateJson } from '@/lib/private-blob';
import { verifyFormWebhook } from '@/lib/connecteam-webhooks';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const apiKey = String(process.env.CONNECTEAM_API_KEY || '').trim();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this deployment.');

    const setup = await readPrivateJson('app-config/active-automation.json');
    if (!setup?.webhookId || !setup?.formId || !setup?.webhookUrl) {
      return Response.json({
        configured: false,
        registered: false,
        deliveryConfirmed: false,
        message: 'No automatically managed webhook is saved yet.'
      });
    }

    const registration = await verifyFormWebhook({
      apiKey,
      webhookId: setup.webhookId,
      formId: setup.formId,
      url: setup.webhookUrl
    });

    const health = await readPrivateJson('app-config/webhook-health.json');
    const deliveryConfirmed = Boolean(
      health?.processedSuccessfully &&
      health?.receivedAt &&
      Number(health.formId) === Number(setup.formId) &&
      health.eventType === 'form_submission'
    );

    return Response.json({
      configured: true,
      registered: registration.verified,
      webhookId: setup.webhookId,
      webhookUrl: setup.webhookUrl,
      deliveryConfirmed,
      lastDelivery: deliveryConfirmed ? health : null,
      message: registration.verified
        ? (deliveryConfirmed
            ? 'Webhook is registered in Connecteam and a form submission has been processed successfully.'
            : 'Webhook is registered and verified in Connecteam. Submit the selected form once to confirm successful end-to-end processing.')
        : 'The saved webhook could not be verified in Connecteam. Save the automation again to repair it.'
    });
  } catch (error) {
    return Response.json({
      configured: false,
      registered: false,
      deliveryConfirmed: false,
      error: error.message
    }, { status: 400 });
  }
}
