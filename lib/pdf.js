import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';

function center(page, text, font, size, y, color = rgb(0.08,0.12,0.22)) {
  const value = String(text || '');
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

function fitSize(font, text, maxWidth, preferred, minimum = 10) {
  let size = preferred;
  const value = String(text || '');
  while (size > minimum && font.widthOfTextAtSize(value, size) > maxWidth) size -= 1;
  return size;
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
    headers: { 'User-Agent': 'Connecteam-Certificate-App/1.4' }
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
    introText: options.introText || 'THIS CERTIFIES THAT',
    completionText: options.completionText || 'HAS SUCCESSFULLY COMPLETED',
    datePrefix: options.datePrefix ?? '',
    signatureLabel: options.signatureLabel || 'Trainer Signature',
    primaryColor: options.primaryColor || '#111111',
    accentColor: options.accentColor || '#111111',
    logoSize: options.logoSize ?? 330,
    showOuterBorder: options.showOuterBorder !== false,
    showExpiryNotice: options.showExpiryNotice !== false
  };
}

function logoBounds(size, layout) {
  // Accept legacy named sizes for existing saved configurations and numeric
  // widths for the resizable logo control.
  const legacy = { small: 170, medium: 235, large: 300 };
  const width = Number.isFinite(Number(size)) ? Number(size) : (legacy[size] || 330);
  return layout === 'department' ? [width, Math.round(width * 0.52)] : [Math.round(width * 0.7), Math.round(width * 0.28)];
}

async function loadLogo(doc, logoBytes, logoUrl) {
  if (!logoBytes?.length && !logoUrl) return null;
  try {
    return logoBytes?.length ? await embedImageBytes(doc, logoBytes) : await embedRemoteImage(doc, logoUrl);
  } catch (error) {
    console.error('Logo embedding failed:', error.message);
    return null;
  }
}

async function loadSignature(doc, signature) {
  if (!signature) return null;
  try {
    return await embedRemoteImage(doc, signature);
  } catch (error) {
    console.error('Signature embedding failed:', error.message);
    return null;
  }
}

export async function buildCertificate({ firstName, lastName, courseName, completionDate, signature, logoUrl, logoBytes, pdfOptions, preview = false }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([792, 612]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const options = defaults(pdfOptions);
  const primary = hexColor(options.primaryColor, rgb(0.07, 0.07, 0.07));
  const accent = hexColor(options.accentColor, primary);
  const logo = await loadLogo(doc, logoBytes, logoUrl);
  const signatureImage = await loadSignature(doc, signature);
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Certificate Recipient';
  const course = courseName || 'Training Course';
  const dateText = `${options.datePrefix ? `${options.datePrefix} ` : ''}${completionDate || ''}`.trim();

  if (options.layout === 'department') {
    if (options.showOuterBorder) {
      page.drawRectangle({ x:12, y:12, width:768, height:588, borderColor:primary, borderWidth:3.5 });
      page.drawRectangle({ x:18, y:18, width:756, height:576, borderColor:accent, borderWidth:1.5 });
    }

    if (logo) {
      // Keep a clear inset from the border, even at the largest slider setting.
      // Position by the top edge so tall logos cannot run off the page or overlap the frame.
      const [requestedW] = logoBounds(options.logoSize, 'department');
      const scaled = logo.scaleToFit(Math.min(requestedW, 420), 130);
      const topY = options.showOuterBorder ? 570 : 586;
      page.drawImage(logo, { x:(792-scaled.width)/2, y:topY-scaled.height, width:scaled.width, height:scaled.height });
    }

    const titleY = logo ? 340 : 445;
    center(page, options.title, bold, fitSize(bold, options.title, 620, 20, 14), titleY, primary);
    center(page, options.introText, regular, fitSize(regular, options.introText, 560, 12, 9), titleY - 30, primary);
    center(page, fullName, regular, fitSize(regular, fullName, 600, 19, 13), titleY - 69, primary);
    center(page, options.completionText, regular, fitSize(regular, options.completionText, 560, 12, 9), titleY - 105, primary);
    center(page, course, regular, fitSize(regular, course, 650, 17, 11), titleY - 145, primary);

    const leftX = 60;
    const leftWidth = 275;
    const rightX = 515;
    const rightWidth = 150;
    const lineY = 92;

    if (signatureImage) {
      const scaled = signatureImage.scaleToFit(leftWidth - 25, 64);
      page.drawImage(signatureImage, { x:leftX + (leftWidth-scaled.width)/2, y:lineY + 4, width:scaled.width, height:scaled.height });
    } else if (preview) {
      page.drawText('Sample Signature', { x:leftX + 32, y:lineY + 10, size:18, font:oblique, color:primary });
    }

    page.drawLine({ start:{x:leftX,y:lineY}, end:{x:leftX+leftWidth,y:lineY}, thickness:1, color:primary });
    page.drawText(options.signatureLabel, { x:leftX, y:lineY - 28, size:11, font:regular, color:primary });

    const dateSize = fitSize(regular, dateText, rightWidth, 14, 10);
    const dateWidth = regular.widthOfTextAtSize(dateText, dateSize);
    page.drawText(dateText, { x:rightX + (rightWidth-dateWidth)/2, y:lineY + 8, size:dateSize, font:regular, color:primary });
    page.drawLine({ start:{x:rightX,y:lineY}, end:{x:rightX+rightWidth,y:lineY}, thickness:1, color:primary });
    page.drawText('Date', { x:rightX, y:lineY - 28, size:11, font:regular, color:primary });
    if (options.showExpiryNotice) {
      const expiry = '*This certificate expires 1 year from the issued date';
      // Give the full sentence enough horizontal room beneath the date field.
      const expirySize = fitSize(regular, expiry, 230, 7, 6);
      const expiryWidth = regular.widthOfTextAtSize(expiry, expirySize);
      page.drawText(expiry, { x:475 + (230-expiryWidth)/2, y:lineY - 48, size:expirySize, font:regular, color:primary });
    }
  } else {
    if (options.showOuterBorder) {
      page.drawRectangle({ x:22, y:22, width:748, height:568, borderColor:primary, borderWidth:3 });
      page.drawRectangle({ x:34, y:34, width:724, height:544, borderColor:accent, borderWidth:1.25 });
    }

    if (logo) {
      const [maxW] = logoBounds(options.logoSize, 'centered');
      const scaled = logo.scaleToFit(Math.min(maxW, 294), 88);
      const topY = options.showOuterBorder ? 558 : 582;
      page.drawImage(logo, { x:(792-scaled.width)/2, y:topY-scaled.height, width:scaled.width, height:scaled.height });
    }

    center(page, options.title, bold, fitSize(bold, options.title, 620, 29, 18), logo ? 445 : 490, primary);
    const introY = 395;
    center(page, options.introText, regular, 15, introY, primary);
    center(page, fullName, bold, fitSize(bold, fullName, 520, 34, 22), introY - 58, primary);
    page.drawLine({ start:{x:180,y:introY - 74}, end:{x:612,y:introY - 74}, thickness:1, color:accent });
    center(page, options.completionText, regular, 15, introY - 116, primary);
    center(page, course, bold, fitSize(bold, course, 620, 23, 14), introY - 162, primary);
    center(page, dateText, regular, 14, introY - 210, primary);
    if (options.showExpiryNotice) {
      center(page, '*This certificate expires 1 year from the issued date', regular, 8, introY - 232, primary);
    }

    if (signatureImage) {
      const scaled = signatureImage.scaleToFit(180, 72);
      page.drawImage(signatureImage, { x:(792-scaled.width)/2, y:88, width:scaled.width, height:scaled.height });
    } else if (preview) {
      center(page, 'Sample Signature', oblique, 18, 102, primary);
    }
    page.drawLine({ start:{x:286,y:82}, end:{x:506,y:82}, thickness:0.8, color:primary });
    center(page, options.signatureLabel, regular, 10, 66, primary);
  }

  return doc.save();
}
