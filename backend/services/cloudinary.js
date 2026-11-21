const cloudinary = require('cloudinary').v2;

function configured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
function configure() {
  if (!configured()) throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}
function uploadBuffer(buffer, resourceType = 'image') {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'luxury-tattoo-studio',
      resource_type: resourceType,
      transformation: resourceType === 'image' ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}
async function deleteAsset(publicId, resourceType = 'image') {
  configure();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
module.exports = { uploadBuffer, deleteAsset };
