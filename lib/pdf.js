import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';

function center(page, text, font, size, y, color = rgb(0.08,0.12,0.22)) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

function hexColor(value, fallback) {
  const raw = String(value || '').replace('#','').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return fallback;
  return rgb(
    parseInt(raw.slice(0,2),16) / 255,
    parseInt(raw.slice(2,4),16) / 255,
    parseInt(raw.slice(4,6),16) / 255
  );
}

async function normalizePng(input) {
  if (!input?.length) return null;
  return sharp(input, { failOn: 'none' }).flatten({ background: '#ffffff' }).png().toBuffer();
}

async function fetchAsPng(url) {
  if (!url) return null;
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'User-Agent': 'Connecteam-Certificate-App/1.3' }
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
  return normalizePng(Buffer.from(await response.arrayBuffer()));
}

async function embedRemoteImage(doc, url) {
  const png = await fetchAsPng(url);
  return png ? doc.embedPng(png) : null;
}

async function embedImageBytes(doc, bytes) {
  const png = await normalizePng(bytes);
  return png ? doc.embedPng(png) : null;
}

function defaults(options = {}) {
  return {
    layout: options.layout || 'department',
    title: options.title || 'CERTIFICATE OF COMPLETION',
    introText: options.introText || 'This certifies that',
    completionText: options.completionText || 'has successfully completed',
    datePrefix: options.datePrefix || 'Completed on',
    signatureLabel: options.signatureLabel || 'Signature',
    primaryColor: options.primaryColor || '#143057',
    accentColor: options.accentColor || '#B8862B',
    logoSize: options.logoSize || 'medium',
    showOuterBorder: options.showOuterBorder !== false
  };
}

function logoBounds(size) {
  if (size === 'small') return [120, 48];
  if (size === 'large') return [210, 82];
  return [165, 64];
}

export async function buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl, logoBytes, pdfOptions }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([792, 612]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const options = defaults(pdfOptions);
  const primary = hexColor(options.primaryColor, rgb(0.08, 0.15, 0.30));
  const accent = hexColor(options.accentColor, rgb(0.72, 0.53, 0.16));
  const hasLogo = Boolean(logoBytes?.length || logoUrl);

  if (options.showOuterBorder) {
    page.drawRectangle({ x:22, y:22, width:748, height:568, borderColor:primary, borderWidth:3 });
    page.drawRectangle({ x:34, y:34, width:724, height:544, borderColor:accent, borderWidth:1.25 });
  }

  let logo = null;
  if (hasLogo) {
    try {
      logo = logoBytes?.length ? await embedImageBytes(doc, logoBytes) : await embedRemoteImage(doc, logoUrl);
    } catch (error) {
      console.error('Logo embedding failed:', error.message);
    }
  }

  if (options.layout === 'centered') {
    if (logo) {
      const [maxW,maxH] = logoBounds(options.logoSize);
      const scaled = logo.scaleToFit(maxW,maxH);
      page.drawImage(logo, { x:(792-scaled.width)/2, y:492, width:scaled.width, height:scaled.height });
    }
    center(page, options.title, bold, 29, logo ? 445 : 490, primary);
  } else {
    if (logo) {
      const [maxW,maxH] = logoBounds(options.logoSize);
      const scaled = logo.scaleToFit(maxW,maxH);
      page.drawImage(logo, { x:62, y:500, width:scaled.width, height:scaled.height });
    }
    page.drawLine({ start:{x:58,y:482}, end:{x:734,y:482}, thickness:1, color:accent });
    center(page, options.title, bold, 28, 435, primary);
  }

  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Certificate Recipient';
  const introY = options.layout === 'centered' ? 395 : 390;
  center(page, options.introText, regular, 15, introY);
  center(page, fullName, bold, Math.min(34, Math.max(22, 520 / Math.max(fullName.length, 1))), introY - 58, primary);
  page.drawLine({ start:{x:180,y:introY - 74}, end:{x:612,y:introY - 74}, thickness:1, color:accent });
  center(page, options.completionText, regular, 15, introY - 116);
  center(page, courseName || 'Training Course', bold, 23, introY - 162, primary);
  center(page, `${options.datePrefix} ${completionDate}`, regular, 14, introY - 210);

  if (signature) {
    try {
      const image = await embedRemoteImage(doc, signature);
      if (image) {
        const scaled = image.scaleToFit(180, 72);
        page.drawImage(image, { x:(792-scaled.width)/2, y:88, width:scaled.width, height:scaled.height });
        page.drawLine({ start:{x:286,y:82}, end:{x:506,y:82}, thickness:0.8, color:primary });
        center(page, options.signatureLabel, regular, 10, 66);
      }
    } catch (error) {
      console.error('Signature embedding failed:', error.message);
    }
  }

  return doc.save();
}
