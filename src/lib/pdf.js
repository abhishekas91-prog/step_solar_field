import { Capacitor } from '@capacitor/core';
import { api } from './api';
import { DOC_PRINT_CSS } from './documents';

let overlayEl = null;
let overlayClose = null;

export function isPdfOverlayOpen() {
  return Boolean(overlayEl);
}

export function closePdfOverlay() {
  overlayClose?.();
}

function uint8ToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function concatBytes(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function jpegToPdf(jpeg, imgW, imgH) {
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 18;
  const fit = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH);
  const w = imgW * fit;
  const h = imgH * fit;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [0];
  function add(part) {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  }
  add('%PDF-1.4\n');
  offsets[1] = offset;
  add('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  offsets[2] = offset;
  add('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n');
  offsets[3] = offset;
  add(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n`);
  offsets[4] = offset;
  add(`4 0 obj << /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`);
  add(jpeg);
  add('\nendstream\nendobj\n');
  offsets[5] = offset;
  const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
  add(`5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj\n`);
  const xref = offset;
  add('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i += 1) {
    add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  add(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return concatBytes(chunks);
}

async function canvasToJpeg(canvas) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
  });
  if (!blob) throw new Error('PDF image nahi bani');
  const buf = new Uint8Array(await blob.arrayBuffer());
  return jpegToPdf(buf, canvas.width, canvas.height);
}

export function pdfFilename(record) {
  const mode = record?.mode || 'document';
  const no = String(record?.docNo || 'doc').replace(/[^\w.-]+/g, '_');
  return `StepSolar-${mode}-${no}.pdf`;
}

async function savePdfBytes(bytes, filename) {
  const base64 = uint8ToBase64(bytes);
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const path = `StepSolar/${filename}`;
    try {
      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return `Documents/${path}`;
    } catch {
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      return filename;
    }
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return filename;
}

async function captureOverlayPdf(root) {
  const target = root.querySelector('.doc2');
  if (!target) throw new Error('Document render nahi hua');
  const prev = target.style.transform;
  target.style.transform = 'none';
  target.style.width = '210mm';
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
  });
  target.style.transform = prev;
  return canvasToJpeg(canvas);
}

export async function sendDocWhatsApp(lead, { docType, docNo, message } = {}) {
  if (!lead?.id) throw new Error('Lead nahi mili');
  const phone = String(lead.phone || '').replace(/\D/g, '');
  if (phone.length < 10) throw new Error('Customer ka valid phone nahi hai');
  return api.sendWhatsAppDoc(lead.id, {
    document_type: docType || 'document',
    document_no: docNo || '',
    message: message || undefined,
  });
}

export function presentPdf({ html, filename, lead, docType, docNo, onStatus }) {
  closePdfOverlay();
  const root = document.createElement('div');
  root.className = 'pdf-sheet';
  root.innerHTML = `
    <div class="pdf-toolbar">
      <button type="button" class="mini" data-act="close">Back</button>
      <strong>${filename}</strong>
      <button type="button" class="mini primary" data-act="save">Save PDF</button>
      <button type="button" class="mini wa" data-act="wa">Send by WhatsApp</button>
    </div>
    <div class="pdf-status" hidden></div>
    <div class="pdf-scroll">
      <style>${DOC_PRINT_CSS}</style>
      <div class="docwrap"><div class="doc2">${html}</div></div>
    </div>
  `;
  document.body.appendChild(root);
  overlayEl = root;

  const statusEl = root.querySelector('.pdf-status');
  function status(msg, isErr) {
    if (!msg) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      onStatus?.(msg, isErr);
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle('err', Boolean(isErr));
    onStatus?.(msg, isErr);
  }

  const close = () => {
    overlayClose = null;
    overlayEl = null;
    root.remove();
  };
  overlayClose = close;

  async function save() {
    status('PDF save ho rahi hai…');
    try {
      const bytes = await captureOverlayPdf(root);
      const where = await savePdfBytes(bytes, filename);
      status(`PDF save ho gayi: ${where}`);
    } catch (e) {
      status(e.message || 'PDF save fail', true);
    }
  }

  async function sendWa() {
    status('WhatsApp se bhej rahe hain…');
    try {
      const out = await sendDocWhatsApp(lead, { docType, docNo });
      if (out?.ok === false && out?.error === 'whatsapp_disabled') {
        throw new Error('WhatsApp Business API CRM mein configure nahi hai');
      }
      if (out?.ok === false) throw new Error(out?.error || 'WhatsApp send fail');
      status('WhatsApp Business API se bhej diya');
    } catch (e) {
      status(e.message || 'WhatsApp send fail', true);
    }
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') close();
    if (act === 'save') save();
    if (act === 'wa') sendWa();
  });

  setTimeout(() => {
    save();
  }, 80);

  return { close, save, sendWa };
}
