const mongoose = require('mongoose');
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  estimatedPrice: { type: Number, required: true, min: 1 },
  deposit: { type: Number, required: true, min: 1 },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Package', packageSchema);
