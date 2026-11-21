const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/auth');
const booking = require('../controllers/bookingController');
const payment = require('../controllers/paymentController');
const admin = require('../controllers/adminController');
const Package = require('../models/Package');
const multer = require('multer');
const { uploadBuffer } = require('../services/cloudinary');
const Portfolio = require('../models/Portfolio');

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
router.use(publicLimiter);
router.get('/health', (req,res) => res.json({ ok: true, service: 'luxury-tattoo-studio-api' }));
router.get('/packages', async (req,res) => res.json({ packages: await Package.find({ active: true }).sort({ sortOrder: 1 }) }));
router.get('/portfolio', async (req,res) => res.json({ portfolio: await Portfolio.find().sort({ sortOrder: 1, createdAt: -1 }) }));
router.post('/bookings/standard', booking.createStandard);
router.post('/bookings/custom', booking.createCustom);
router.get('/bookings/track/:reference', booking.track);
router.post('/payments/paystack/initialize', payment.initializePaystack);
router.get('/payments/paystack/verify/:reference', payment.verifyPaystack);
router.post('/payments/nowpayments/invoice', payment.createNowInvoice);

router.post('/admin/login', admin.login);
router.use('/admin', auth);
router.get('/admin/me', admin.me);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 *  1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG, WEBP, GIF, MP4, WEBM or MOV files are allowed.'), ok);
  }
});
router.post('/admin/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose an image or video file.' });
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const asset = await uploadBuffer(req.file.buffer, resourceType);
    res.status(201).json({ url: asset.secure_url, publicId: asset.public_id, resourceType });
  } catch (e) { res.status(400).json({ message: e.message || 'Upload failed.' }); }
});
router.get('/admin/dashboard', admin.dashboard);
router.get('/admin/bookings', admin.listBookings);
router.patch('/admin/bookings/:id', admin.updateBooking);
router.post('/admin/bookings/:id/quote', admin.quoteBooking);
router.get('/admin/payments', admin.listPayments);
router.get('/admin/packages', admin.listPackages);
router.post('/admin/packages', admin.createPackage);
router.patch('/admin/packages/:id', admin.updatePackage);
router.delete('/admin/packages/:id', admin.deletePackage);
router.get('/admin/portfolio', admin.listPortfolio);
router.post('/admin/portfolio', admin.createPortfolio);
router.delete('/admin/portfolio/:id', admin.deletePortfolio);
router.get('/admin/settings', admin.getSettings);
router.patch('/admin/settings', admin.updateSettings);
module.exports = router;
