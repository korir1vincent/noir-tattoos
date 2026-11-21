const crypto = require('crypto');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const { bookingNotice } = require('../services/email');

const makeReference = () => `TS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

exports.createStandard = async (req, res) => {
  try {
    const { name, email, phone, packageId, tattooStyle, size, placement, description, preferredDate } = req.body;
    if (!name || !email || !phone || !packageId) return res.status(400).json({ message: 'Name, email, phone and package are required.' });
    const pack = await Package.findOne({ _id: packageId, active: true });
    if (!pack) return res.status(404).json({ message: 'Package not found.' });
    const booking = await Booking.create({
      reference: makeReference(), type: 'standard',
      customer: { name, email, phone }, package: pack._id,
      tattooStyle, size, placement, description, preferredDate: preferredDate || undefined,
      estimatedPrice: pack.estimatedPrice, depositAmount: pack.deposit,
      remainingBalance: Math.max(0, pack.estimatedPrice - pack.deposit),
      status: 'awaiting_deposit'
    });
    await bookingNotice(booking, 'Your tattoo booking request was received', `Booking ${booking.reference} has been created. Deposit due: $${booking.depositAmount.toFixed(2)} USD. Complete payment to secure your appointment.`);
    res.status(201).json({ booking: { reference: booking.reference, depositAmount: booking.depositAmount, status: booking.status, id: booking._id } });
  } catch (e) { res.status(500).json({ message: e.message || 'Could not create booking.' }); }
};

exports.createCustom = async (req, res) => {
  try {
    const { name, email, phone, tattooStyle, size, placement, description, preferredDate, referenceImages = [] } = req.body;
    if (!name || !email || !phone || !description) return res.status(400).json({ message: 'Name, email, phone and tattoo description are required.' });
    if (!Array.isArray(referenceImages)) return res.status(400).json({ message: 'referenceImages must be an array of URLs.' });
    const booking = await Booking.create({
      reference: makeReference(), type: 'custom', customer: { name, email, phone },
      tattooStyle, size, placement, description, preferredDate: preferredDate || undefined,
      referenceImages: referenceImages.slice(0, 5), status: 'awaiting_review', paymentStatus: 'unpaid'
    });
    await bookingNotice(booking, 'Your custom tattoo request was received', `Thank you. Your request ${booking.reference} is awaiting artist review. The studio will contact you with a quote.`);
    res.status(201).json({ booking: { reference: booking.reference, status: booking.status } });
  } catch (e) { res.status(500).json({ message: e.message || 'Could not submit custom request.' }); }
};

exports.track = async (req, res) => {
  const booking = await Booking.findOne({ reference: req.params.reference }).select('reference type status paymentStatus depositAmount estimatedPrice remainingBalance preferredDate');
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  res.json({ booking });
};
