import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';

function center(page, text, font, size, y, color = rgb(0.08,0.12,0.22)) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

async function fetchAsPng(url) {
  if (!url) return null;
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'User-Agent': 'Connecteam-Certificate-App/1.1' }
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
  const input = Buffer.from(await response.arrayBuffer());
  if (!input.length) throw new Error('Downloaded image was empty.');
  return sharp(input, { failOn: 'none' }).flatten({ background: '#ffffff' }).png().toBuffer();
}

async function embedRemoteImage(doc, url) {
  const png = await fetchAsPng(url);
  return png ? doc.embedPng(png) : null;
}

export async function buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([792, 612]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.72, 0.53, 0.16);
  const navy = rgb(0.08, 0.15, 0.30);

  page.drawRectangle({ x:22, y:22, width:748, height:568, borderColor:navy, borderWidth:4 });
  page.drawRectangle({ x:34, y:34, width:724, height:544, borderColor:gold, borderWidth:1.5 });

  if (logoUrl) {
    try {
      const logo = await embedRemoteImage(doc, logoUrl);
      if (logo) {
        const scaled = logo.scaleToFit(150, 62);
        page.drawImage(logo, { x:60, y:515, width:scaled.width, height:scaled.height });
      }
    } catch (error) {
      console.error('Logo embedding failed:', error.message, logoUrl);
    }
  }

  center(page, 'CERTIFICATE OF COMPLETION', bold, 29, logoUrl ? 474 : 500, navy);
  center(page, 'This certifies that', regular, 16, 421);
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Certificate Recipient';
  center(page, fullName, bold, Math.min(34, Math.max(22, 520 / Math.max(fullName.length, 1))), 360, navy);
  page.drawLine({ start:{x:180,y:344}, end:{x:612,y:344}, thickness:1, color:gold });
  center(page, 'has successfully completed', regular, 16, 304);
  center(page, courseName || 'Training Course', bold, 23, 258, navy);
  center(page, `Completed on ${completionDate}`, regular, 14, 210);

  if (signature) {
    try {
      const image = await embedRemoteImage(doc, signature);
      if (image) {
        const scaled = image.scaleToFit(180, 72);
        page.drawImage(image, { x:(792-scaled.width)/2, y:105, width:scaled.width, height:scaled.height });
        page.drawLine({ start:{x:286,y:99}, end:{x:506,y:99}, thickness:0.8, color:navy });
        center(page, 'Signature', regular, 10, 82);
      }
    } catch (error) {
      console.error('Signature embedding failed:', error.message, signature);
    }
  }

  return doc.save();
}
