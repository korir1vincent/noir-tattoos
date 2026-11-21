const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const Portfolio = require('../models/Portfolio');
const Setting = require('../models/Setting');
const { sendEmail } = require('../services/email');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!admin || !(await admin.comparePassword(password || ''))) return res.status(401).json({ message: 'Invalid email or password.' });
  admin.lastLogin = new Date(); await admin.save();
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
  res.json({ token, admin: { email: admin.email, role: admin.role } });
};
exports.me = (req, res) => res.json({ admin: { email: req.admin.email, role: req.admin.role } });
exports.dashboard = async (req, res) => {
  const [totalBookings, pending, paid, revenue, recent] = await Promise.all([
    Booking.countDocuments(), Booking.countDocuments({ status: { $in: ['awaiting_review','awaiting_deposit'] } }),
    Booking.countDocuments({ paymentStatus: 'paid' }), Payment.aggregate([{ $match: { status: { $in: ['confirmed','finished'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Booking.find().sort({ createdAt: -1 }).limit(6)
  ]);
  res.json({ stats: { totalBookings, pending, paid, revenue: revenue[0]?.total || 0 }, recent });
};
exports.listBookings = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const bookings = await Booking.find(filter).populate('package').sort({ createdAt: -1 }).limit(250);
  res.json({ bookings });
};
exports.updateBooking = async (req, res) => {
  const allowed = ['status','preferredDate','quoteMessage'];
  const update = {};
  for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  await sendEmail({ to: booking.customer.email, subject: `Booking ${booking.reference} update`, text: `Your booking status is now: ${booking.status}. ${booking.quoteMessage || ''}` });
  res.json({ booking });
};
exports.quoteBooking = async (req, res) => {
  try {
    const price = Number(req.body.estimatedPrice);
    const deposit = Number(req.body.depositAmount);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(deposit) ||
      price <= 0 ||
      deposit <= 0 ||
      deposit > price
    ) {
      return res.status(400).json({
        message: 'Enter a valid total price and deposit.'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(409).json({
        message: 'This booking already has a paid deposit.'
      });
    }

    booking.estimatedPrice = price;
    booking.depositAmount = deposit;
    booking.remainingBalance = price - deposit;
    booking.quoteMessage = String(req.body.quoteMessage || '');
    booking.status = 'awaiting_deposit';

    await booking.save();

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5000')
      .replace(/\/$/, '');

    const paymentUrl =
      `${baseUrl}/payment.html?booking=${encodeURIComponent(booking.reference)}`;

    const escapeHtml = value =>
      String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);

    const message = escapeHtml(booking.quoteMessage)
      .replace(/\n/g, '<br>');

    let emailSent = false;

    try {
      await sendEmail({
        to: booking.customer.email,
        subject: `Your tattoo quote is ready (${booking.reference})`,

        text: `
Hello ${booking.customer.name},

Your custom tattoo quote is ready.

Booking reference: ${booking.reference}

Estimated total: $${price.toFixed(2)} USD
Required deposit: $${deposit.toFixed(2)} USD
Remaining balance: $${(price - deposit).toFixed(2)} USD

Artist's message:
${booking.quoteMessage || 'Thank you for choosing NOIR INK.'}

Pay your deposit here:
${paymentUrl}

Thank you,
NOIR INK Tattoo Atelier
        `,

        html: `
<div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#292929;background:#ffffff;border:1px solid #e8e2d8">

  <div style="background:#171717;padding:30px;text-align:center">
    <h1 style="color:#c5a46d;letter-spacing:4px;margin:0">NOIR INK</h1>
    <p style="color:#ffffff;font-size:11px;letter-spacing:3px">TATTOO ATELIER</p>
  </div>

  <div style="padding:30px">
    <h2>Your tattoo quote is ready.</h2>

    <p>Hello ${escapeHtml(booking.customer.name)},</p>

    <p>Thank you for trusting NOIR INK with your tattoo idea.
    Our artist has reviewed your request and prepared your quote.</p>

    <div style="background:#f7f5f1;padding:20px;margin:25px 0">
      <p><strong>Booking reference:</strong><br>${escapeHtml(booking.reference)}</p>

      <p><strong>Estimated total:</strong><br>$${price.toFixed(2)} USD</p>

      <p><strong>Required deposit:</strong><br>
      <span style="font-size:24px;color:#a17b3d">$${deposit.toFixed(2)} USD</span></p>

      <p><strong>Remaining balance:</strong><br>
      $${(price - deposit).toFixed(2)} USD</p>
    </div>

    <h3>Message from your artist</h3>
    <p>${message || 'Thank you for choosing NOIR INK.'}</p>

    <div style="text-align:center;margin:35px 0">
      <a href="${escapeHtml(paymentUrl)}"
         style="background:#b69760;color:#ffffff;padding:16px 30px;text-decoration:none;font-weight:bold;display:inline-block">
        PAY YOUR DEPOSIT
      </a>
    </div>

    <p style="font-size:13px;color:#777">
      Your appointment will be confirmed once your deposit has been successfully verified.
    </p>

    <p>Thank you,<br><strong>NOIR INK Tattoo Atelier</strong></p>
  </div>
</div>
        `
      });

      emailSent = true;

    } catch (emailError) {
      console.error('Custom quote email failed:', emailError.message);
    }

    return res.json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Quote saved and customer email sent.'
        : 'Quote saved, but the customer email could not be sent.',
      booking
    });

  } catch (error) {
    console.error('Quote error:', error.message);

    return res.status(500).json({
      message: 'Could not save the custom tattoo quote.'
    });
  }
};
exports.listPayments = async (req, res) => {
  const payments = await Payment.find().populate('booking').sort({ createdAt: -1 }).limit(300);
  res.json({ payments });
};
exports.listPackages = async (req, res) => res.json({ packages: await Package.find().sort({ sortOrder: 1, createdAt: 1 }) });
exports.createPackage = async (req, res) => {
  const pack = await Package.create(req.body); res.status(201).json({ package: pack });
};
exports.updatePackage = async (req, res) => {
  const pack = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!pack) return res.status(404).json({ message: 'Package not found.' }); res.json({ package: pack });
};
exports.deletePackage = async (req, res) => {
  await Package.findByIdAndDelete(req.params.id); res.json({ message: 'Package deleted.' });
};
exports.listPortfolio = async (req, res) => res.json({ portfolio: await Portfolio.find().sort({ sortOrder: 1, createdAt: -1 }) });
exports.createPortfolio = async (req, res) => {
  const { title, category, imageUrl, publicId, featured } = req.body;
  if (!title || !imageUrl) return res.status(400).json({ message: 'Title and image URL are required.' });
  const item = await Portfolio.create({ title, category, imageUrl, publicId, featured: !!featured }); res.status(201).json({ item });
};
exports.deletePortfolio = async (req, res) => {
  await Portfolio.findByIdAndDelete(req.params.id); res.json({ message: 'Portfolio item deleted.' });
};
exports.getSettings = async (req, res) => {
  const rows = await Setting.find();
  res.json({ settings: Object.fromEntries(rows.map(x => [x.key, x.value])) });
};
exports.updateSettings = async (req, res) => {
  const allowed = ['studioName','tagline','contactEmail','phone','address','instagram','whatsapp','about'];
  for (const key of allowed) if (req.body[key] !== undefined) await Setting.findOneAndUpdate({ key }, { value: req.body[key] }, { upsert: true, new: true });
  res.json({ message: 'Settings saved.' });
};
