const mongoose = require('mongoose');
const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Custom' },
  imageUrl: { type: String, required: true },
  publicId: String,
  featured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Portfolio', portfolioSchema);
