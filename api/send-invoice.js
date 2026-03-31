// /api/send-invoice.js - Vercel serverless function
// Generates a PDF invoice and sends it via Gmail using nodemailer
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, clientName, invoiceNumber, invoiceDate, dueDate, items, subtotal, tax, total, notes, companyName, companyPhone, status } = req.body;
    if (!to || !invoiceNumber || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required fields: to, invoiceNumber, items' });
    }
    const company = companyName || 'ServicePro by TurfCure';
    const phone = companyPhone || '713-470-92-70';
    const fromEmail = process.env.GMAIL_USER || 'turfcure@gmail.com';

    const pdfBuffer = await generateInvoicePDF({ company, phone, fromEmail, clientName, invoiceNumber, invoiceDate, dueDate, items, subtotal, tax, total, notes, status });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    const htmlBody = buildEmailHTML({ company, clientName, invoiceNumber, invoiceDate, dueDate, total, status });

    const info = await transporter.sendMail({
      from: '"' + company + '" <' + fromEmail + '>',
      to,
      subject: company + ' - Invoice ' + invoiceNumber,
      html: htmlBody,
      attachments: [{ filename: invoiceNumber + '.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
    });

    return res.status(200).json({ ok: true, messageId: info.messageId, to, invoiceNumber });
  } catch (err) {
    console.error('send-invoice error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send invoice' });
  }
                                                          }

function generateInvoicePDF({ company, phone, fromEmail, clientName, invoiceNumber, invoiceDate, dueDate, items, subtotal, tax, total, notes, status }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const green = '#2E7D32';
    const darkGray = '#333333';
    const lightGray = '#F5F5F5';
    const medGray = '#888888';

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill(green);
    doc.fill('#FFFFFF').fontSize(24).font('Helvetica-Bold').text(company, 50, 30);
    doc.fontSize(10).font('Helvetica').text(phone + '  |  ' + fromEmail, 50, 60);

    // Invoice Title + Status
    doc.fill(darkGray).fontSize(28).font('Helvetica-Bold').text('INVOICE', 50, 120);
    if (status) {
      var sc = status === 'Paid' ? green : '#F57C00';
      doc.fill(sc).fontSize(14).font('Helvetica-Bold').text(status.toUpperCase(), 400, 128, { align: 'right' });
    }

    // Invoice Info
    var iy = 165;
    doc.fill(medGray).fontSize(9).font('Helvetica');
    doc.text('Invoice Number', 50, iy);
    doc.text('Invoice Date', 200, iy);
    doc.text('Due Date', 350, iy);
    doc.fill(darkGray).fontSize(11).font('Helvetica-Bold');
    doc.text(invoiceNumber, 50, iy + 14);
    doc.text(invoiceDate || '-', 200, iy + 14);
    doc.text(dueDate || '-', 350, iy + 14);

    // Bill To
    var by2 = iy + 50;
    doc.fill(medGray).fontSize(9).font('Helvetica').text('Bill To', 50, by2);
    doc.fill(darkGray).fontSize(12).font('Helvetica-Bold').text(clientName || 'Client', 50, by2 + 14);

    // Items Table
    var tt = by2 + 55;
    doc.rect(50, tt, doc.page.width - 100, 24).fill(green);
    doc.fill('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, tt + 7);
    doc.text('QTY', 340, tt + 7, { width: 50, align: 'center' });
    doc.text('UNIT PRICE', 395, tt + 7, { width: 70, align: 'right' });
    doc.text('AMOUNT', 475, tt + 7, { width: 70, align: 'right' });

    var ry = tt + 28;
    (items || []).forEach(function(item, idx) {
      var bg = idx % 2 === 0 ? '#FFFFFF' : lightGray;
      doc.rect(50, ry - 4, doc.page.width - 100, 22).fill(bg);
      var qty = item.qty || item.quantity || 1;
      var price = item.unitPrice || item.price || 0;
      var amount = qty * price;
      doc.fill(darkGray).fontSize(10).font('Helvetica');
      doc.text(item.description || item.name || '-', 60, ry);
      doc.text(String(qty), 340, ry, { width: 50, align: 'center' });
      doc.text('$' + price.toFixed(2), 395, ry, { width: 70, align: 'right' });
      doc.text('$' + amount.toFixed(2), 475, ry, { width: 70, align: 'right' });
      ry += 22;
    });

    // Totals
    var tly = ry + 20;
    doc.moveTo(380, tly).lineTo(545, tly).stroke('#DDDDDD');
    doc.fill(medGray).fontSize(10).font('Helvetica').text('Subtotal', 380, tly + 8);
    doc.fill(darkGray).font('Helvetica-Bold').text('$' + (subtotal || 0).toFixed(2), 475, tly + 8, { width: 70, align: 'right' });
    doc.fill(medGray).font('Helvetica').text('Tax', 380, tly + 28);
    doc.fill(darkGray).font('Helvetica-Bold').text('$' + (tax || 0).toFixed(2), 475, tly + 28, { width: 70, align: 'right' });
    doc.moveTo(380, tly + 48).lineTo(545, tly + 48).stroke('#DDDDDD');
    doc.fill(green).fontSize(14).font('Helvetica-Bold').text('Total', 380, tly + 56);
    doc.text('$' + (total || 0).toFixed(2), 475, tly + 56, { width: 70, align: 'right' });

    if (notes) {
      var ny = tly + 100;
      doc.fill(medGray).fontSize(9).font('Helvetica').text('Notes', 50, ny);
      doc.fill(darkGray).fontSize(10).font('Helvetica').text(notes, 50, ny + 14, { width: 300 });
    }

    var fy = doc.page.height - 50;
    doc.fill(medGray).fontSize(8).font('Helvetica')
      .text(company + '  *  ' + phone + '  *  ' + fromEmail, 50, fy, { align: 'center', width: doc.page.width - 100 });
    doc.text('Thank you for your business!', 50, fy + 12, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  });
                                                                 }

function buildEmailHTML({ company, clientName, invoiceNumber, invoiceDate, dueDate, total, status }) {
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>';
  h += '<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;"><tr><td align="center">';
  h += '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">';
  // Header
  h += '<tr><td style="background:#2E7D32;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">' + company + '</h1></td></tr>';
  // Body
  h += '<tr><td style="padding:32px;">';
  h += '<p style="margin:0 0 16px;color:#333;font-size:16px;">Hi <strong>' + (clientName || 'there') + '</strong>,</p>';
  h += '<p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">Please find attached your invoice <strong>' + invoiceNumber + '</strong>.';
  if (dueDate) h += ' Payment is due by <strong>' + dueDate + '</strong>.';
  h += '</p>';
  // Invoice summary card
  h += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;">';
  h += '<tr><td style="padding:20px;"><table width="100%" cellpadding="0" cellspacing="0">';
  h += '<tr><td style="color:#888;font-size:12px;text-transform:uppercase;">Invoice</td>';
  h += '<td style="color:#888;font-size:12px;text-transform:uppercase;" align="right">Amount Due</td></tr>';
  h += '<tr><td style="color:#333;font-size:18px;font-weight:700;padding-top:4px;">' + invoiceNumber + '</td>';
  h += '<td style="color:#2E7D32;font-size:24px;font-weight:700;padding-top:4px;" align="right">$' + (total || 0).toFixed(2) + '</td></tr>';
  h += '<tr><td style="color:#888;font-size:12px;padding-top:8px;">Date: ' + (invoiceDate || '-') + '</td>';
  h += '<td style="color:#888;font-size:12px;padding-top:8px;" align="right">' + (status ? 'Status: <strong>' + status + '</strong>' : '') + '</td></tr>';
  h += '</table></td></tr></table>';
  h += '<p style="margin:24px 0 0;color:#555;font-size:13px;line-height:1.5;">The PDF invoice is attached to this email. If you have any questions, feel free to reply.</p>';
  h += '</td></tr>';
  // Footer
  h += '<tr><td style="background:#fafafa;padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;color:#999;font-size:12px;text-align:center;">' + company + ' - Thank you for your business!</p></td></tr>';
  h += '</table></td></tr></table></body></html>';
  return h;
}
