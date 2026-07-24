import { put } from '@vercel/blob';
import { getBlobToken } from '@/lib/blob';

export const runtime='nodejs';

export async function POST(request){
 try {
  const token=getBlobToken();
  const {formId,formName,mapping,logoUrl}=await request.json();
  const origin=new URL(request.url).origin;
  const webhookUrl=`${origin}/api/connecteam/webhook`;
  const setup={formId:Number(formId),formName,mapping,logoUrl:logoUrl||'',webhookUrl,createdAt:new Date().toISOString(),active:true};
  await put('app-config/active-automation.json',JSON.stringify(setup),{access:'public',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false,token});
  return Response.json({created:false,webhookUrl,setup,warning:'Create one Connecteam webhook manually using this URL.'});
 } catch(e){return Response.json({error:e.message},{status:400})}
}
