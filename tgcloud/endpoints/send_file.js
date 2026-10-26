import { api, db, InputFile, EndpointError } from 'sdk';
import { eq, sql } from 'sdk/db';
import { uploads } from '../schema.js';

const MAX_BYTES = 50 * 1024 * 1024;  // Telegram's limit for bot uploads
const MAX_PARTS = 40;

// Called by the mini app once per piece of the file (pieces are base64 text).
// input: { upload_id, index, total, name, mime, chunk }
export default async function (input, ctx) {
  const user = ctx.initData && ctx.initData.user;
  if (!user) throw new EndpointError('افتح المحرر من داخل البوت.');

  const { upload_id, index, total, name, mime, chunk } = input || {};
  if (typeof upload_id !== 'string' || !/^[a-z0-9]{8,40}$/i.test(upload_id)) throw new EndpointError('طلب غير صالح.');
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > MAX_PARTS || index < 0 || index >= total)
    throw new EndpointError('الملف أكبر من الحد المسموح (50 ميغابايت).');
  if (typeof chunk !== 'string') throw new EndpointError('طلب غير صالح.');

  const bytes = base64ToBytes(chunk);

  if (index === 0) {
    // Clean up anything older than an hour.
    const hourAgo = Math.floor(Date.now() / 1000) - 3600;
    await db.run(sql`DELETE FROM uploads WHERE created_at < ${hourAgo}`);
  }

  if (total === 1) return send(user.id, name, mime, bytes);

  await db.insert(uploads).values({ uploadId: upload_id, userId: user.id, idx: index, data: bytes }).run();
  if (index < total - 1) return { ok: true, received: index + 1 };

  // Last piece: put the file back together and send it.
  const rows = (await db.select().from(uploads).where(eq(uploads.uploadId, upload_id)).all())
    .filter(r => r.userId === user.id)
    .sort((a, b) => a.idx - b.idx);
  await db.delete(uploads).where(eq(uploads.uploadId, upload_id)).run();
  if (rows.length !== total) throw new EndpointError('لم تصل كل أجزاء الملف. حاول مرة أخرى.');

  const parts = rows.map(r => r.data instanceof Uint8Array ? r.data : new Uint8Array(r.data));
  const size = parts.reduce((s, p) => s + p.length, 0);
  const file = new Uint8Array(size);
  let off = 0;
  for (const p of parts) { file.set(p, off); off += p.length; }
  return send(user.id, name, mime, file);
}

async function send(chatId, name, mime, bytes) {
  if (bytes.length > MAX_BYTES) throw new EndpointError('الملف أكبر من الحد المسموح (50 ميغابايت).');
  const safeName = String(name || 'file.pdf').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  try {
    await api.sendDocument({
      chat_id: chatId,
      document: new InputFile(bytes, safeName, { type: String(mime || 'application/pdf') })
    });
  } catch (e) {
    if (e && e.code === 403) throw new EndpointError('اضغط «ابدأ» في البوت أولاً حتى يستطيع إرسال الملفات إليك.');
    throw new EndpointError('تعذّر إرسال الملف إلى المحادثة.');
  }
  return { ok: true, sent: true };
}

// Base64 decoder that does not depend on atob/Buffer.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64.length; i++) LOOKUP[B64.charCodeAt(i)] = i;
function base64ToBytes(s) {
  s = s.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor(s.length * 3 / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = LOOKUP[s.charCodeAt(i)], b = LOOKUP[s.charCodeAt(i + 1)];
    const c = LOOKUP[s.charCodeAt(i + 2)], d = LOOKUP[s.charCodeAt(i + 3)];
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (p < len) out[p++] = (n >> 16) & 255;
    if (i + 2 < s.length && p < len) out[p++] = (n >> 8) & 255;
    if (i + 3 < s.length && p < len) out[p++] = n & 255;
  }
  return out;
}
