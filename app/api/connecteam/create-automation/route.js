import { requireApiAuth } from '@/lib/auth';
import { getWebhookToken } from '@/lib/webhook-auth';
import { provisionFormWebhook } from '@/lib/connecteam-webhooks';
import { putAdaptive } from '@/lib/private-blob';

export const runtime='nodejs';

export async function POST(request){
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const apiKey = String(process.env.CONNECTEAM_API_KEY || '').trim();
    if (!apiKey) throw new Error('CONNECTEAM_API_KEY is missing from this deployment.');

    const input=await request.json();
    const workflows=Array.isArray(input.workflows)&&input.workflows.length ? input.workflows : [input];
    if(!workflows.length) throw new Error('Add at least one form workflow.');
    const origin=new URL(request.url).origin;
    const webhookUrl=`${origin}/api/connecteam/webhook`;
    const secretKey=getWebhookToken();
    const savedWorkflows=[];
    const webhookResults=[];
    for(const w of workflows){
      if(!w.formId) throw new Error('Every workflow must have a Connecteam form.');
      const webhook=await provisionFormWebhook({apiKey,formId:Number(w.formId),formName:w.formName,url:webhookUrl,secretKey});
      webhookResults.push(webhook);
      savedWorkflows.push({
        formId:Number(w.formId),formName:w.formName,mapping:w.mapping||{},
        logoPath:w.logoPath||'',logoUrl:w.logoPath?'':(w.logoUrl||''),
        pdfOptions:w.pdfOptions||{},documentId:w.documentId?Number(w.documentId):null,
        expiresAt:w.expiresAt||'',webhookId:webhook.webhookId,webhookName:webhook.webhookName,
        webhookVerified:true,active:w.active!==false
      });
    }
    const setup={workflows:savedWorkflows,formId:savedWorkflows[0].formId,formName:savedWorkflows[0].formName,
      mapping:savedWorkflows[0].mapping,logoPath:savedWorkflows[0].logoPath,logoUrl:savedWorkflows[0].logoUrl,
      pdfOptions:savedWorkflows[0].pdfOptions,webhookUrl,webhookIds:webhookResults.map(x=>x.webhookId),
      webhookVerified:true,webhookCreatedAutomatically:true,webhookSecurity:'x-webhook-secret',
      createdAt:new Date().toISOString(),active:true};
    await putAdaptive('app-config/active-automation.json',JSON.stringify(setup),{
      contentType:'application/json',allowOverwrite:true,addRandomSuffix:false
    });

    return Response.json({
      created:true,
      verified:true,
      webhookAction:webhookResults[0].action,
      webhookId:webhookResults[0].webhookId,
      webhookResults,
      webhookUrl,
      setup
    });
  } catch(e){
    return Response.json({error:e.message},{status:400});
  }
}
