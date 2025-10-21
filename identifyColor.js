const path = require('path')
const fs = require('fs')
const { Jimp, intToRGBA } = require('jimp')
const { colorIsBlack, getColorDifference } = require('./backendUtils')

const getColorName = (r, g, b) => {
  const knownColors = [
    { name: 'G', r: 83, g: 141, b: 78, a: 1 },
    // { name: 'black', r: 18, g: 18, b: 19, a: 1 },
    { name: '-', r: 58, g: 58, b: 60, a: 1 },
    { name: 'Y', r: 181, g: 159, b: 59, a: 1 },
    { name: 'white', r: 255, g: 255, b: 255, a: 1 },
  ]

  if (colorIsBlack(r, g, b)) {
    return 'black'
  }

  const tolerance = 36

  for (const color of knownColors) {
    const totalDifference = getColorDifference(color, { r, g, b })

    if (totalDifference < tolerance) {
      return color.name
    }
  }

  return 'unknown'
}

// Function to identify the color of an image buffer
const identifyColor = async (buffer) => {
  try {
    // Load the image from the buffer
    const image = await Jimp.read(buffer)

    // Get the color of a pixel (near top-left corner)
    const pixelColor = image.getPixelColor(6, 6)

    // Convert the color to RGBA
    const { r, g, b, a } = intToRGBA(pixelColor)

    // Identify the color
    const colorName = getColorName(r, g, b, a)
    return colorName
  } catch (error) {
    console.error('Error identifying color from buffer:', error)
    return 'unknown'
  }
}

// Main function to process files
const run = async () => {
  const files = [
    'color_1.png',
    'black_color.png',
    'gray_color.png',
    'yellow_color.png',
    'color_white.png',
  ]

  for (const file of files) {
    console.log(`Identifying color in ${file}`)
    const filepath = path.join(__dirname, 'data', file)

    try {
      // Read the file into a buffer
      const buffer = fs.readFileSync(filepath)

      // Identify the color from the buffer
      const colorName = await identifyColor(buffer)
      console.log(`Identified color: ${colorName}`)
    } catch (error) {
      console.error('Error processing file:', error)
    }
  }
}

if (require.main === module) {
  run()
}

module.exports = { identifyColor, getColorName }
