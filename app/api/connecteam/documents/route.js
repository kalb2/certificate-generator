import { connecteamFetch, findArray } from '@/lib/connecteam';
import { requireApiAuth } from '@/lib/auth';

export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const apiKey=String(process.env.CONNECTEAM_API_KEY||'').trim();
    if(!apiKey) throw new Error('CONNECTEAM_API_KEY is missing.');
    const payload=await connecteamFetch('/documents/v1/documents?limit=300&offset=0',apiKey);
    const data=payload.data||payload;
    const docs=findArray(data,['documents','items','results']).map(d=>({
      id:Number(d.documentId??d.id),
      name:String(d.name??d.title??'Document'),
      documentType:String(d.documentType||''),
      expiration:d.expiration||null,
      isReviewRequired:Boolean(d.isReviewRequired)
    })).filter(d=>Number.isFinite(d.id)&&d.documentType==='document');
    return Response.json({documents:docs});
  } catch(e){return Response.json({error:e.message},{status:400});}
}
