import { put } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';
import { requireApiAuth } from '@/lib/auth';
import { getWebhookToken } from '@/lib/webhook-auth';

export const runtime='nodejs';

export async function POST(request){
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const {formId,formName,mapping,logoPath,logoUrl}=await request.json();
    const origin=new URL(request.url).origin;
    const webhookUrl=`${origin}/api/connecteam/webhook?token=${getWebhookToken()}`;
    const setup={
      formId:Number(formId),
      formName,
      mapping,
      logoPath:logoPath||'',
      logoUrl:logoPath ? '' : (logoUrl||''),
      webhookUrl,
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
    return Response.json({created:false,webhookUrl,setup,warning:'Create one Connecteam webhook manually using this URL.'});
  } catch(e){
    return Response.json({error:e.message},{status:400});
  }
}
