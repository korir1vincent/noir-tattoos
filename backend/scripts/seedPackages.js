require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('../models/Package');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const defaults = [
      { name: 'Small Tattoo', description: 'A delicate design for a smaller area.', estimatedPrice: 100, deposit: 30, sortOrder: 1 },
      { name: 'Medium Tattoo', description: 'A more detailed design with additional session time.', estimatedPrice: 200, deposit: 50, sortOrder: 2 },
      { name: 'Large Tattoo', description: 'A larger piece with more detail and shading.', estimatedPrice: 400, deposit: 100, sortOrder: 3 },
      { name: 'Extra Large', description: 'A substantial custom piece or multi-hour session.', estimatedPrice: 600, deposit: 150, sortOrder: 4 }
    ];
    for (const item of defaults) await Package.updateOne({ name: item.name }, { $setOnInsert: item }, { upsert: true });
    console.log('Default USD packages ready.');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
