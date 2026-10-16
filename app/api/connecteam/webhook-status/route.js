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
    if (!setup) {
      return Response.json({
        configured: false,
        state: 'not_configured',
        registered: false,
        deliveryConfirmed: false,
        message: 'No certificate automation has been saved yet.'
      });
    }

    if (!setup.webhookId) {
      return Response.json({
        configured: true,
        state: 'needs_provisioning',
        registered: false,
        deliveryConfirmed: false,
        legacySetup: true,
        message: 'This saved setup predates automatic webhook creation. Load the form and click Save automation once to create and verify the Connecteam webhook.'
      });
    }

    if (!setup.formId || !setup.webhookUrl) {
      return Response.json({
        configured: true,
        state: 'invalid_setup',
        registered: false,
        deliveryConfirmed: false,
        message: 'The saved automation is incomplete. Save the automation again to repair it.'
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
      state: registration.verified ? (deliveryConfirmed ? 'healthy' : 'registered') : 'verification_failed',
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
      state: 'check_failed',
      registered: false,
      deliveryConfirmed: false,
      error: error.message,
      message: error.message
    }, { status: 400 });
  }
}
