const express = require('express');
const router = express.Router();

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const {
  verifyPaystackLegacy,
  verifyPaystackSigningSecret,
  verifyNowPayments
} = require('../utils/payment');

const { markPaid } = require('../controllers/paymentController');

const amountsMatch = (a, b) =>
  Number.isFinite(Number(a)) &&
  Number.isFinite(Number(b)) &&
  Math.round(Number(a) * 100) === Math.round(Number(b) * 100);


// PAYSTACK WEBHOOK
router.post('/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const raw = req.body;

    const signature =
      req.get('Paystack-Signature') ||
      req.get('x-paystack-signature');

    const valid = process.env.PAYSTACK_WEBHOOK_SECRET
      ? verifyPaystackSigningSecret(raw, req.get('Paystack-Signature'))
      : verifyPaystackLegacy(raw, signature);

    if (!valid) return res.status(401).send('Invalid signature');

    const event = JSON.parse(raw.toString('utf8'));

    if (event.event === 'charge.success') {
      const data = event.data;

      const payment = await Payment.findOne({
        reference: data.reference,
        provider: 'paystack'
      }).populate('booking');

      if (
        payment &&
        data.status === 'success' &&
        data.currency === 'USD' &&
        Number(data.amount) === Math.round(payment.amount * 100)
      ) {
        await markPaid(payment, data);
      }
    }

    return res.sendStatus(200);

  } catch (e) {
    console.error('Paystack webhook error:', e.message);
    return res.sendStatus(500);
  }
});


// NOWPAYMENTS WEBHOOK
router.post('/nowpayments', express.json({ limit: '100kb' }), async (req, res) => {
  try {
    const data = req.body;
    const signature = req.get('x-nowpayments-sig');

    // Verify NOWPayments IPN signature.
    if (!verifyNowPayments(data, signature)) {
      return res.status(401).send('Invalid signature');
    }

    const orderId = String(data.order_id || '');
    const invoiceId = String(data.invoice_id || '');

    if (!orderId) {
      return res.status(400).send('Missing order ID');
    }

    // Find the exact NOWPayments transaction.
    const payment = await Payment.findOne({
      reference: orderId,
      provider: 'nowpayments'
    }).populate('booking');

    if (!payment) {
      console.error('NOWPayments payment not found:', orderId);
      return res.sendStatus(200);
    }

    // Verify invoice identity when the provider supplies it.
    if (
      payment.providerId &&
      invoiceId &&
      payment.providerId !== invoiceId
    ) {
      console.error('NOWPayments invoice ID mismatch:', orderId);
      return res.status(400).send('Invoice ID mismatch');
    }

    // Verify the original invoice was denominated in USD.
    if (
      String(data.price_currency || '').toLowerCase() !== 'usd' ||
      String(payment.currency || '').toUpperCase() !== 'USD'
    ) {
      console.error('NOWPayments currency mismatch:', orderId);
      return res.status(400).send('Currency mismatch');
    }

    // Verify the invoice amount matches the approved deposit.
    if (!amountsMatch(data.price_amount, payment.amount)) {
      console.error('NOWPayments amount mismatch:', orderId);
      return res.status(400).send('Amount mismatch');
    }

    const status = String(data.payment_status || '').toLowerCase();

    payment.raw = data;

    // Only FINISHED means the payment is complete.
    if (status === 'finished') {
      await markPaid(payment, data);
      return res.sendStatus(200);
    }

    // Record intermediate and unsuccessful statuses.
    const allowedStatuses = [
      'waiting',
      'confirming',
      'confirmed',
      'failed',
      'expired',
      'refunded'
    ];

    if (allowedStatuses.includes(status)) {
      payment.status = status;
      await payment.save();
    }

    // Update the booking when a payment fails or expires.
    if (['failed', 'expired', 'refunded'].includes(status)) {
      const booking = await Booking.findById(payment.booking._id);

      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus =
          status === 'refunded' ? 'refunded' : 'failed';

        await booking.save();
      }
    }

    return res.sendStatus(200);

  } catch (e) {
    console.error('NOWPayments webhook error:', e.message);

    // A server error allows the provider to retry its notification.
    return res.sendStatus(500);
  }
});

module.exports = router;