const crypto = require('crypto');

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function verifyPaystackLegacy(rawBody, signature) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const digest = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return safeEqual(digest, signature);
}
function verifyPaystackSigningSecret(rawBody, header) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.trim().split('=')));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now()/1000 - timestamp) > 300) return false;
  const signatures = header.split(',').map(p => p.trim()).filter(p => p.startsWith('v1=')).map(p => p.slice(3).split(':').pop());
  const digest = crypto.createHmac('sha512', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
  return signatures.some(sig => safeEqual(digest, sig));
}
function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = sortObject(value[key]);
      return out;
    }, {});
  }
  return value;
}
function verifyNowPayments(payload, signature) {
  if (!process.env.NOWPAYMENTS_IPN_SECRET || !signature) return false;
  const sorted = JSON.stringify(sortObject(payload));
  const digest = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET).update(sorted).digest('hex');
  return safeEqual(digest.toLowerCase(), String(signature).toLowerCase());
}
module.exports = { verifyPaystackLegacy, verifyPaystackSigningSecret, verifyNowPayments };
