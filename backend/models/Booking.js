const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  reference: { type: String, unique: true, index: true },
  type: { type: String, enum: ['standard', 'custom'], required: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true }
  },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', default: null },
  tattooStyle: String,
  size: String,
  placement: String,
  description: String,
  referenceImages: [String],
  preferredDate: Date,
  estimatedPrice: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  quoteMessage: String,
  status: { type: String, enum: ['awaiting_review','awaiting_deposit','deposit_received','confirmed','completed','cancelled','rejected'], default: 'awaiting_deposit' },
  paymentStatus: { type: String, enum: ['unpaid','pending','partially_paid','paid','failed','refunded'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['paystack','nowpayments', null], default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
