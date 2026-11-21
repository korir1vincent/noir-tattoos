const axios = require('axios');
const BASE = (process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1').replace(/\/$/, '');

async function createInvoice({ amount, currency, orderId, description, successUrl, cancelUrl, callbackUrl }) {
  if (!process.env.NOWPAYMENTS_API_KEY) throw new Error('NOWPayments is not configured.');
  const response = await axios.post(`${BASE}/invoice`, {
    price_amount: Number(amount).toFixed(2),
    price_currency: 'usd',
    pay_currency: currency,
    order_id: orderId,
    order_description: description,
    ipn_callback_url: callbackUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    is_fixed_rate: true
  }, { headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' } });
  return response.data;
}
module.exports = { createInvoice };
