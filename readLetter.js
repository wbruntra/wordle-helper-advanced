const tesseract = require('tesseract.js')

/**
 * Perform OCR on a given image buffer to extract the letter.
 * @param {Buffer} imageBuffer - The image buffer.
 * @returns {Promise<string>} - The recognized letter.
 */
async function performOCR(imageBuffer) {
  try {
    const {
      data: { text },
    } = await tesseract.recognize(imageBuffer, 'eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Limit to uppercase letters
    })
    return text.trim() // Return the recognized letter
  } catch (error) {
    console.error(`Error performing OCR:`, error)
    return '' // Return an empty string if OCR fails
  }
}

module.exports = performOCR
