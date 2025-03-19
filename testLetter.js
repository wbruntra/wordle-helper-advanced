const performOCR = require('./readLetter')
const fs = require('fs')
const path = require('path')
const convertToBlackAndWhite = require('./convertToBW')

const run = async () => {
  const testFile = path.join(__dirname, 'debug', 'square_row3_col2.png')
  let imageBuffer = fs.readFileSync(testFile)

  imageBuffer = convertToBlackAndWhite(imageBuffer)

  // Save the black and white image for debugging
  const debugDir = path.join(__dirname, 'debug')
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir)
  }
  const bwImagePath = path.join(debugDir, 'black_and_white.png')
  fs.writeFileSync(bwImagePath, imageBuffer)
  console.log(`Black and white image saved to ${bwImagePath}`)

  const result = await performOCR(imageBuffer)
  console.log('OCR Result:', result)
}

run().then(() => {
  process.exit(0)
})