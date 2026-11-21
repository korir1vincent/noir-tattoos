const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  reference: { type: String, unique: true, sparse: true, index: true },
  provider: { type: String, enum: ['paystack','nowpayments'], required: true },
  providerId: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending','waiting','confirming','confirmed','finished','failed','expired','refunded'], default: 'pending' },
  checkoutUrl: String,
  cryptoCurrency: String,
  raw: mongoose.Schema.Types.Mixed,
  paidAt: Date
}, { timestamps: true });
module.exports = mongoose.model('Payment', paymentSchema);
