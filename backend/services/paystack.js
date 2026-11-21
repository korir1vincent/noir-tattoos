const axios = require('axios');
const BASE = 'https://api.paystack.co';

function headers() {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Paystack is not configured.');
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}
async function initialize({ email, amount, reference, callbackUrl, metadata }) {
  const response = await axios.post(`${BASE}/transaction/initialize`, {
    email, amount: Math.round(amount * 100), currency: 'USD',
    reference, callback_url: callbackUrl, metadata
  }, { headers: headers(), timeout: 15000 });
  if (!response.data.status) throw new Error(response.data.message || 'Paystack initialization failed.');
  return response.data.data;
}
async function verify(reference) {
  const response = await axios.get(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers(), timeout: 15000 });
  if (!response.data.status) throw new Error(response.data.message || 'Paystack verification failed.');
  return response.data.data;
}
module.exports = { initialize, verify };
