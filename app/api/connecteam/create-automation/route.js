import { put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { requireApiAuth } from '@/lib/auth';
import { getWebhookToken } from '@/lib/webhook-auth';
import { provisionFormWebhook } from '@/lib/connecteam-webhooks';

export const runtime='nodejs';

export async function POST(request){
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const apiKey = String(process.env.CONNECTEAM_API_KEY || '').trim();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this deployment.');

    const {formId,formName,mapping,logoPath,logoUrl,pdfOptions}=await request.json();
    if (!formId) throw new Error('Choose a Connecteam form first.');

    const origin=new URL(request.url).origin;
    const webhookUrl=`${origin}/api/connecteam/webhook`;
    const secretKey=getWebhookToken();

    const webhook = await provisionFormWebhook({
      apiKey,
      formId:Number(formId),
      formName,
      url:webhookUrl,
      secretKey
    });

    const setup={
      formId:Number(formId),
      formName,
      mapping,
      logoPath:logoPath||'',
      logoUrl:logoPath ? '' : (logoUrl||''),
      pdfOptions:pdfOptions||{},
      webhookUrl,
      webhookId:webhook.webhookId,
      webhookName:webhook.webhookName,
      webhookVerified:true,
      webhookCreatedAutomatically:true,
      webhookSecurity:'x-webhook-secret',
      createdAt:new Date().toISOString(),
      active:true
    };

    await put('app-config/active-automation.json',JSON.stringify(setup),{
      access:'private',
      contentType:'application/json',
      allowOverwrite:true,
      addRandomSuffix:false,
      ...blobAuth()
    });

    return Response.json({
      created:true,
      verified:true,
      webhookAction:webhook.action,
      webhookId:webhook.webhookId,
      webhookUrl,
      setup
    });
  } catch(e){
    return Response.json({error:e.message},{status:400});
  }
}
