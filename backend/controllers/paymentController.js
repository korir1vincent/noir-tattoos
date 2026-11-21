const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const paystack = require('../services/paystack');
const nowpayments = require('../services/nowpayments');
const { sendEmail } = require('../services/email');

const publicUrl = (path) => `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}${path}`;

exports.initializePaystack = async (req, res) => {
  try {
    const { bookingReference } = req.body;
    const booking = await Booking.findOne({ reference: bookingReference });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!booking.depositAmount || booking.depositAmount <= 0) return res.status(400).json({ message: 'This booking has no approved deposit yet.' });
    if (['deposit_received','confirmed','completed'].includes(booking.status)) return res.status(409).json({ message: 'This booking deposit is already paid.' });
    const reference = `ps_${crypto.randomBytes(16).toString('hex')}`;
    const payment = await Payment.create({ booking: booking._id, reference, provider: 'paystack', amount: booking.depositAmount, status: 'pending' });
    const checkout = await paystack.initialize({
      email: booking.customer.email, amount: booking.depositAmount, reference,
      callbackUrl: publicUrl('/payment-result.html'),
      metadata: { bookingReference: booking.reference, paymentId: payment._id.toString() }
    });
    payment.checkoutUrl = checkout.authorization_url;
    await payment.save();
    booking.paymentStatus = 'pending'; booking.paymentMethod = 'paystack'; await booking.save();
    res.json({ checkoutUrl: checkout.authorization_url, reference });
  } catch (e) { res.status(502).json({ message: e.response?.data?.message || e.message || 'Could not start Paystack checkout.' }); }
};

exports.verifyPaystack = async (req, res) => {
  try {
    const data = await paystack.verify(req.params.reference);
    if (data.status !== 'success' || data.currency !== 'USD') return res.status(400).json({ message: 'Payment is not successful or currency does not match USD.' });
    const payment = await Payment.findOne({ reference: req.params.reference }).populate('booking');
    if (!payment) return res.status(404).json({ message: 'Payment reference not found.' });
    if (Math.round(Number(data.amount)) !== Math.round(payment.amount * 100)) return res.status(400).json({ message: 'Payment amount mismatch.' });
    await markPaid(payment, data);
    res.json({ success: true, bookingReference: payment.booking.reference });
  } catch (e) { res.status(502).json({ message: e.response?.data?.message || e.message || 'Verification failed.' }); }
};

exports.createNowInvoice = async (req, res) => {
  try {
    const { bookingReference, payCurrency } = req.body;
    const allowed = (process.env.NOWPAYMENTS_ALLOWED_CURRENCIES || 'btc,eth,usdttrc20,usdterc20,usdc,usdcerc20').split(',').map(x => x.trim().toLowerCase());
    const currency = String(payCurrency || '').toLowerCase();
    if (!allowed.includes(currency)) return res.status(400).json({ message: 'That cryptocurrency is not enabled by this shop.' });
    const booking = await Booking.findOne({ reference: bookingReference });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!booking.depositAmount || booking.depositAmount <= 0) return res.status(400).json({ message: 'This booking has no approved deposit yet.' });
    const orderId = `np_${crypto.randomBytes(14).toString('hex')}`;
    const payment = await Payment.create({ booking: booking._id, reference: orderId, provider: 'nowpayments', amount: booking.depositAmount, currency: 'USD', cryptoCurrency: currency, status: 'pending' });
    const invoice = await nowpayments.createInvoice({
      amount: booking.depositAmount, currency, orderId, description: `Tattoo deposit ${booking.reference}`,
      successUrl: publicUrl('/payment-result.html'), cancelUrl: publicUrl('/payment-result.html'),
      callbackUrl: `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/api/webhooks/nowpayments`
    });
    payment.providerId = String(invoice.id || '');
    payment.checkoutUrl = invoice.invoice_url;
    payment.raw = invoice;
    await payment.save();
    booking.paymentStatus = 'pending'; booking.paymentMethod = 'nowpayments'; await booking.save();
    res.json({ checkoutUrl: invoice.invoice_url, invoiceId: invoice.id });
  } catch (e) { res.status(502).json({ message: e.response?.data?.message || e.message || 'Could not create crypto invoice.' }); }
};

async function markPaid(payment, raw) {
  if (['confirmed','finished'].includes(payment.status)) return;
  payment.status = payment.provider === 'paystack' ? 'confirmed' : 'finished';
  payment.paidAt = new Date();
  payment.raw = raw;
  await payment.save();
  const booking = await Booking.findById(payment.booking._id || payment.booking);
  if (booking) {
    booking.paymentStatus = 'paid';
    booking.status = 'deposit_received';
    booking.remainingBalance = Math.max(0, Number(booking.estimatedPrice || 0) - Number(payment.amount));
    await booking.save();
    await sendEmail({ to: booking.customer.email, subject: 'Tattoo deposit received', text: `We received your deposit for booking ${booking.reference}. The studio will confirm your appointment shortly.` });
    await sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, subject: 'Tattoo deposit received', text: `Deposit received for ${booking.reference}: $${payment.amount.toFixed(2)} USD.` });
  }
}
exports.markPaid = markPaid;
