const PNG = require('pngjs').PNG;

/**
 * Convert an image buffer to black text on a white background.
 * White (or near-white) becomes black, and all other colors become white.
 * @param {Buffer} imageBuffer - The input image buffer.
 * @param {number} threshold - The RGB threshold for determining "white" (default: 200).
 * @returns {Buffer} - The converted image buffer.
 */
function convertToBlackAndWhite(imageBuffer, threshold = 200) {
  const png = PNG.sync.read(imageBuffer); // Parse the PNG buffer
  const { width, height, data } = png;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4; // Index of the pixel in the data array
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Calculate the brightness of the pixel
      const brightness = (r + g + b) / 3;

      if (brightness > threshold) {
        // Near-white pixel: Set to black
        data[idx] = 0; // Red
        data[idx + 1] = 0; // Green
        data[idx + 2] = 0; // Blue
      } else {
        // Any other color: Set to transparent
        data[idx] = 255; // Red
        data[idx + 1] = 255; // Green
        data[idx + 2] = 255; // Blue
      }

      // Keep the alpha channel unchanged
    }
  }

  // Write the modified PNG back to a buffer
  return PNG.sync.write(png);
}

module.exports = convertToBlackAndWhite