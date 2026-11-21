// const jwt = require('jsonwebtoken');
// const Admin = require('../models/Admin');

// module.exports = async function requireAdmin(req, res, next) {
//   try {
//     const header = req.headers.authorization || '';
//     const token = header.startsWith('Bearer ') ? header.slice(7) : null;
//     if (!token) return res.status(401).json({ message: 'Admin authentication required.' });
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     const admin = await Admin.findById(payload.id);
//     if (!admin) return res.status(401).json({ message: 'Admin account not found.' });
//     req.admin = admin;
//     next();
//   } catch {
//     return res.status(401).json({ message: 'Invalid or expired admin session.' });
//   }
// };




const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: 'Admin authentication required.'
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.id || payload.role !== 'admin') {
      return res.status(403).json({
        message: 'Administrator access required.'
      });
    }

    const admin = await Admin.findById(payload.id);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        message: 'Administrator account not authorized.'
      });
    }

    req.admin = admin;
    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired admin session.'
    });
  }
};