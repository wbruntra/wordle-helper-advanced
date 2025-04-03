const performOCR = require('./readLetter')
const fs = require('fs')
const path = require('path')
const convertToBlackAndWhite = require('./convertToBW')
const PNG = require('pngjs').PNG

/**
 * Get the width and height of an image buffer.
 * @param {Buffer} imageBuffer - The image buffer.
 * @returns {{ width: number, height: number }} - The dimensions of the image.
 */
function getImageDimensions(imageBuffer) {
  const png = PNG.sync.read(imageBuffer) // Parse the PNG buffer
  return { width: png.width, height: png.height }
}

const run = async () => {
  const testFile = path.join(__dirname, 'debug', 'square_row3_col2.png')
  let imageBuffer = fs.readFileSync(testFile)

  // imageBuffer = convertToBlackAndWhite(imageBuffer)

  const { width, height } = getImageDimensions(imageBuffer)
  console.log(`Image Dimensions: ${width}x${height}`)

  const cropTopAt = Math.floor(0.2 * height)
  const cropBottomAt = Math.floor(0.7 * height)
  const cropLeftAt = Math.floor(0.2 * width)
  const cropRightAt = Math.floor(0.8 * width)

  // create new image buffer with cropped dimensions

  const png = PNG.sync.read(imageBuffer)
  const croppedWidth = cropRightAt - cropLeftAt
  const croppedHeight = cropBottomAt - cropTopAt

  const cropped = new PNG({ width: croppedWidth, height: croppedHeight })

  for (let y = 0; y < croppedHeight; y++) {
    for (let x = 0; x < croppedWidth; x++) {
      const sourceIdx = ((cropTopAt + y) * width + (cropLeftAt + x)) * 4 // Source pixel index
      const destIdx = (y * croppedWidth + x) * 4 // Destination pixel index

      cropped.data[destIdx] = png.data[sourceIdx] // Red
      cropped.data[destIdx + 1] = png.data[sourceIdx + 1] // Green
      cropped.data[destIdx + 2] = png.data[sourceIdx + 2] // Blue
      cropped.data[destIdx + 3] = png.data[sourceIdx + 3] // Alpha
    }
  }

  // Write the cropped image to a buffer
  const croppedBuffer = PNG.sync.write(cropped)

  const debugDir = path.join(__dirname, 'debug')
  const debugImgPath = path.join(debugDir, 'debug.png')
  // fs.writeFileSync(debugImgPath, croppedBuffer)
  // console.log(`Black and white image saved to ${bwImagePath}`)

  const result = await performOCR(imageBuffer)
  console.log('OCR Result:', result)
}

run().then(() => {
  process.exit(0)
})
