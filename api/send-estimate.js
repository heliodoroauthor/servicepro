// api/send-estimate.js - PDF estimate generation + Gmail sending + Cloudinary upload
// Vercel serverless function
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import https from 'https';

function uploadToCloudinary(pdfBuffer, publicId) {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('[send-estimate] Cloudinary env vars missing, skipping upload');
      return resolve(null);
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'ServicePro/estimates';
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');
    const boundary = '----CloudinaryBoundary' + Date.now();
    const fields = { file: null, api_key: apiKey, timestamp: String(timestamp), signature, folder, public_id: publicId, resource_type: 'raw' };
    let bodyParts = [];
    for (const [key, val] of Object.entries(fields)) {
      if (key === 'file' || val === null) continue;
      bodyParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
    }
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${publicId}.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;
    const headerBuf = Buffer.from(fileHeader, 'utf8');
    const footerBuf = Buffer.from(fileFooter, 'utf8');
    const fieldsBuf = Buffer.from(bodyParts.join(''), 'utf8');
    const fullBody = Buffer.concat([fieldsBuf, headerBuf, pdfBuffer, footerBuf]);
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/raw/upload`,
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': fullBody.length }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) resolve({ url: json.secure_url, public_id: json.public_id, asset_id: json.asset_id, folder: json.folder, bytes: json.bytes });
          else { console.error('[send-estimate] Cloudinary response:', data); resolve(null); }
        } catch (e) { console.error('[send-estimate] Cloudinary parse error:', e.message); resolve(null); }
      });
    });
    req.on('error', (e) => { console.error('[send-estimate] Cloudinary upload error:', e.message); resolve(null); });
    req.write(fullBody);
    req.end();
  });
}

function generateEstimatePDF(data) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const blue = '#1565C0';
    const { clientName, estimateNumber, estimateDate, validUntil, items = [], subtotal = 0, tax = 0, total = 0, notes, companyName = 'ServicePro by TurfCure', companyPhone = '', companyEmail = '', status = 'draft', jobTitle = '', jobId = '' } = data;
    doc.rect(0, 0, 612, 100).fill(blue);
    doc.fill('#fff').fontSize(28).font('Helvetica-Bold').text(companyName, 50, 30);
    doc.fontSize(12).font('Helvetica').text('ESTIMATE', 50, 65);
    if (companyPhone) doc.text(companyPhone, 400, 35, { align: 'right' });
    if (companyEmail) doc.text(companyEmail, 400, 52, { align: 'right' });
    doc.fill('#333').fontSize(11).font('Helvetica');
    const detailY = 120;
    doc.font('Helvetica-Bold').text('Estimate Number:', 50, detailY);
    doc.font('Helvetica').text(estimateNumber || 'N/A', 180, detailY);
    doc.font('Helvetica-Bold').text('Date:', 50, detailY + 18);
    doc.font('Helvetica').text(estimateDate || new Date().toLocaleDateString(), 180, detailY + 18);
    doc.font('Helvetica-Bold').text('Valid Until:', 50, detailY + 36);
    doc.font('Helvetica').text(validUntil || '30 days', 180, detailY + 36);
    doc.font('Helvetica-Bold').text('Status:', 50, detailY + 54);
    doc.font('Helvetica').text(status.toUpperCase(), 180, detailY + 54);
    if (jobTitle) { doc.font('Helvetica-Bold').text('Job:', 50, detailY + 72); doc.font('Helvetica').text(jobTitle, 180, detailY + 72); }
    doc.font('Helvetica-Bold').text('Prepared For:', 350, detailY);
    doc.font('Helvetica').text(clientName || 'N/A', 350, detailY + 18);
    const tableTop = detailY + (jobTitle ? 108 : 90);
    doc.rect(50, tableTop, 512, 22).fill(blue);
    doc.fill('#fff').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 55, tableTop + 6);
    doc.text('Qty', 340, tableTop + 6, { width: 50, align: 'center' });
    doc.text('Unit Price', 395, tableTop + 6, { width: 70, align: 'right' });
    doc.text('Amount', 475, tableTop + 6, { width: 80, align: 'right' });
    let y = tableTop + 26;
    doc.fill('#333').font('Helvetica').fontSize(10);
    (items || []).forEach((item, i) => {
      const bg = i % 2 === 0 ? '#f5f7fa' : '#fff';
      doc.rect(50, y - 2, 512, 20).fill(bg);
      doc.fill('#333');
      doc.text(item.description || '', 55, y + 2, { width: 280 });
      doc.text(String(item.qty || 1), 340, y + 2, { width: 50, align: 'center' });
      doc.text('$' + (item.unitPrice || 0).toFixed(2), 395, y + 2, { width: 70, align: 'right' });
      const amt = (item.qty || 1) * (item.unitPrice || 0);
      doc.text('$' + amt.toFixed(2), 475, y + 2, { width: 80, align: 'right' });
      y += 20;
    });
    y += 10;
    doc.moveTo(350, y).lineTo(562, y).stroke('#ccc');
    y += 8;
    doc.font('Helvetica').text('Subtotal:', 400, y);
    doc.text('$' + Number(subtotal).toFixed(2), 475, y, { width: 80, align: 'right' });
    y += 18;
    doc.text('Tax:', 400, y);
    doc.text('$' + Number(tax).toFixed(2), 475, y, { width: 80, align: 'right' });
    y += 18;
    doc.moveTo(400, y).lineTo(562, y).stroke('#ccc');
    y += 6;
    doc.font('Helvetica-Bold').fontSize(14).fill(blue);
    doc.text('Total:', 400, y);
    doc.text('$' + Number(total).toFixed(2), 460, y, { width: 95, align: 'right' });
    if (notes) { y += 40; doc.fill('#333').fontSize(10).font('Helvetica-Bold').text('Notes:', 50, y); doc.font('Helvetica').text(notes, 50, y + 16, { width: 400 }); }
    y += 80;
    doc.fill('#333').fontSize(10).font('Helvetica');
    doc.moveTo(50, y).lineTo(250, y).stroke('#999');
    doc.text('Client Signature', 50, y + 4);
    doc.moveTo(300, y).lineTo(500, y).stroke('#999');
    doc.text('Date', 300, y + 4);
    doc.fill('#999').fontSize(8).font('Helvetica');
    doc.text('Generated by ServicePro by TurfCure', 50, 720, { align: 'center', width: 512 });
    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { to, clientName, estimateNumber, estimateDate, validUntil, items, subtotal, tax, total, notes, companyName, companyPhone, companyEmail, status, jobId, jobTitle } = req.body;
    if (!to || !estimateNumber) return res.status(400).json({ error: 'Missing required fields: to, estimateNumber' });
    const pdfBuffer = await generateEstimatePDF(req.body);
    const cloudinaryPublicId = `estimate_${estimateNumber}_${Date.now()}`;
    const cloudinaryResult = await uploadToCloudinary(pdfBuffer, cloudinaryPublicId);
    if (cloudinaryResult) console.log('[send-estimate] Uploaded to Cloudinary:', cloudinaryResult.url);
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    let emailResult = null;
    if (user && pass) {
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
      const company = companyName || 'ServicePro by TurfCure';
      const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#1565C0;padding:24px;border-radius:8px 8px 0 0;"><h1 style="color:#fff;margin:0;font-size:22px;">${company}</h1><p style="color:#bbdefb;margin:4px 0 0;font-size:13px;">Estimate #${estimateNumber}</p></div><div style="padding:24px;background:#f9f9f9;border:1px solid #e0e0e0;"><p>Dear ${clientName || 'Customer'},</p><p>Please find your estimate attached.</p><div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:16px 0;"><table style="width:100%;font-size:14px;"><tr><td style="padding:4px 0;color:#666;">Estimate #</td><td style="text-align:right;font-weight:bold;">${estimateNumber}</td></tr><tr><td style="padding:4px 0;color:#666;">Date</td><td style="text-align:right;">${estimateDate || 'N/A'}</td></tr><tr><td style="padding:4px 0;color:#666;">Valid Until</td><td style="text-align:right;">${validUntil || '30 days'}</td></tr>${jobTitle ? `<tr><td style="padding:4px 0;color:#666;">Job</td><td style="text-align:right;">${jobTitle}</td></tr>` : ''}<tr><td style="padding:4px 0;border-top:1px solid #eee;font-weight:bold;color:#1565C0;">Total</td><td style="text-align:right;border-top:1px solid #eee;font-weight:bold;font-size:18px;color:#1565C0;">$${Number(total || 0).toFixed(2)}</td></tr></table></div>${cloudinaryResult ? `<p style="font-size:12px;color:#666;">You can also <a href="${cloudinaryResult.url}">view this estimate online</a>.</p>` : ''}<p style="color:#666;font-size:12px;">Thank you for considering our services!</p></div></div>`;
      const info = await transporter.sendMail({
        from: `"${company}" <${user}>`,
        to,
        subject: `Estimate #${estimateNumber} from ${company}`,
        html: htmlBody,
        attachments: [{ filename: `Estimate-${estimateNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
      emailResult = { messageId: info.messageId, to };
    }
    return res.status(200).json({ ok: true, estimateNumber, to, messageId: emailResult?.messageId || null, cloudinary: cloudinaryResult || null, jobId: jobId || null });
  } catch (err) {
    console.error('[send-estimate] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
