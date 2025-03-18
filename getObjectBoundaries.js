const PNG = require('pngjs').PNG
const { getColorName } = require('./identifyColor')
const imageToPng = require('./imageToPng')
const preprocessImage = require('./preprocessImage')
const { colorIsBlack, getColorDifference } = require('./utils')

// Constants and Utilities
const COLORS = {
  BLACK: { r: 18, g: 18, b: 19, a: 255 },
  WHITE: { r: 255, g: 255, b: 255, a: 1 },
}

const generateColorMatcher = (refColor) => (r, g, b) => {
  const tolerance = 30
  return getColorDifference(refColor, { r, g, b }) < tolerance
}

// const isBackgroundColor = generateColorMatcher(COLORS.BLACK)

// Image Processing Helpers
function getPixelColor(data, width, x, y) {
  const idx = (y * width + x) * 4
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3],
  }
}

function findHorizontalBoundaries(data, width, y, height) {
  let left = -1
  let right = -1

  // Get the color of the first pixel on the line as the background color
  const { r: bgR, g: bgG, b: bgB, a: bgA } = getPixelColor(data, width, 4, y)

  const backgroundColor = { r: bgR, g: bgG, b: bgB }

  const isBackgroundColor = generateColorMatcher(backgroundColor)

  // console.log('Reference background color:', backgroundColor)

  for (let x = 0; x < width; x++) {
    const { r, g, b, a } = getPixelColor(data, width, x, y)
    if (!isBackgroundColor(r, g, b)) {
      left = x
      break
    }
  }

  for (let x = width - 1; x >= 0; x--) {
    const { r, g, b, a } = getPixelColor(data, width, x, y)
    if (!isBackgroundColor(r, g, b)) {
      right = x
      break
    }
  }

  return { left, right, backgroundColor }
}

function findTopBoundary(data, width, leftBoundary, startY, backgroundColor) {
  const isBackgroundColor = generateColorMatcher(backgroundColor)

  for (let y = startY; y >= 0; y--) {
    const { r, g, b } = getPixelColor(data, width, leftBoundary, y)
    if (isBackgroundColor(r, g, b)) return y + 1
  }
  return 0
}

function findSquareWidth(data, width, leftBoundary, topBoundary) {
  // Get the reference color from pixel at (6,6) relative to the boundaries
  const refX = leftBoundary + 6
  const refY = topBoundary + 6
  const { r: refR, g: refG, b: refB } = getPixelColor(data, width, refX, refY)
  const referenceColor = { r: refR, g: refG, b: refB }

  // Create a matcher for the reference color
  const isReferenceColor = generateColorMatcher(referenceColor)

  // Scan from left to right starting at leftBoundary to find the first non-matching color
  let squareEnd = -1

  for (let x = leftBoundary; x < width; x++) {
    const { r, g, b } = getPixelColor(data, width, x, topBoundary)
    if (!isReferenceColor(r, g, b)) {
      squareEnd = x
      break
    }
  }

  // If no end is found, return -1 (square extends to image edge)
  if (squareEnd === -1) {
    console.log('No square end found - matches reference color to edge')
    return -1
  }

  // Calculate square width (distance from leftBoundary to first non-matching color)
  const squareWidth = squareEnd - leftBoundary
  console.log(`Calculated square width: ${squareWidth}px`)

  return squareWidth
}

function calculateGridDimensions(objectWidth, objectHeight, squareWidth) {
  const numSquares = 5
  const numRows = 6
  const totalHorizontalBorderWidth = objectWidth - numSquares * squareWidth
  const singleBorderWidth = Math.floor(totalHorizontalBorderWidth / (numSquares - 1))
  const totalVerticalBorderWidth = objectHeight - numRows * squareWidth
  const singleVerticalBorderWidth = Math.round(totalVerticalBorderWidth / (numRows - 1))

  return {
    singleBorderWidth,
    rowHeight: squareWidth, // Assuming square dimensions; adjust if needed
    totalHorizontalBorderWidth,
    totalVerticalBorderWidth,
    singleVerticalBorderWidth,
  }
}

function identifySquareColors(
  data,
  width,
  height,
  leftBoundary,
  topBoundary,
  squareWidth,
  borderWidth,
) {
  const squareColors = []
  const offsetX = 6
  const offsetY = 6
  const numRows = 6
  const rowHeight = squareWidth + borderWidth

  // Math.round((height - topBoundary - (numRows - 1) * borderWidth) / numRows)

  for (let row = 0; row < numRows; row++) {
    const rowColors = []
    const sampleY = topBoundary + row * (rowHeight + borderWidth) + offsetY

    for (let col = 0; col < 5; col++) {
      const squareStartX = leftBoundary + col * (squareWidth + borderWidth)
      const sampleX = squareStartX + offsetX

      if (sampleX >= width || sampleY >= height) {
        rowColors.push({ square: col + 1, color: 'Out of bounds', x: sampleX, y: sampleY })
        continue
      }

      const { r, g, b } = getPixelColor(data, width, sampleX, sampleY)
      const color = getColorName(r, g, b)
      rowColors.push({ square: col + 1, color, x: sampleX, y: sampleY })
    }
    squareColors.push({ row: row + 1, colors: rowColors })
  }

  return squareColors
}

function generateRowStrings(squareColors) {
  return squareColors.map(({ row, colors }) => {
    const hasBlack = colors.some((c) => c.color.toLowerCase() === 'black')
    if (hasBlack) return { row, string: null }

    const colorString = colors
      .map((c) => {
        switch (c.color.toUpperCase()) {
          case 'G':
            return 'G'
          case 'Y':
            return 'Y'
          case '-':
            return '-'
          default:
            return '-'
        }
      })
      .join('')
    return { row, string: colorString }
  })
}

function cropImage(data, width, height, leftBoundary, topBoundary, objectWidth, objectHeight) {
  const cropped = new PNG({ width: objectWidth, height: objectHeight })
  for (let y = 0; y < objectHeight; y++) {
    for (let x = 0; x < objectWidth; x++) {
      const sourceIdx = ((topBoundary + y) * width + (leftBoundary + x)) * 4
      const destIdx = (y * objectWidth + x) * 4
      cropped.data[destIdx] = data[sourceIdx]
      cropped.data[destIdx + 1] = data[sourceIdx + 1]
      cropped.data[destIdx + 2] = data[sourceIdx + 2]
      cropped.data[destIdx + 3] = data[sourceIdx + 3]
    }
  }
  const croppedBuffer = PNG.sync.write(cropped)
  return croppedBuffer
}

// Main Function
function getGuessKeys(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, png) => {
      if (err) return reject(err)

      const { width, height, data } = png
      const yStep = 25

      for (let y = 5; y < height; y += yStep) {
        const { left, right, backgroundColor } = findHorizontalBoundaries(data, width, y, height)
        if (left === -1 || right === -1) continue

        const objectWidth = right - left + 1
        const topBoundary = findTopBoundary(data, width, left, y, backgroundColor)
        const objectHeight = height - topBoundary

        // Crop the image first
        const croppedBuffer = cropImage(
          data,
          width,
          height,
          left,
          topBoundary,
          objectWidth,
          objectHeight,
        )

        // Parse the cropped buffer to work with the cropped data
        new PNG().parse(croppedBuffer, (cropErr, croppedPng) => {
          if (cropErr) return reject(cropErr)

          console.log('Cropped width is', croppedPng.width)
          console.log('Cropped height is', croppedPng.height)

          const { width: croppedWidth, height: croppedHeight, data: croppedData } = croppedPng

          // Now use cropped data for square detection
          const squareWidth = findSquareWidth(croppedData, croppedWidth, 0, 0, backgroundColor)

          const result = {
            boundaries: { y, leftBoundary: left, rightBoundary: right, topBoundary },
            object: { width: objectWidth, height: objectHeight },
            squareWidth,
            croppedBuffer, // Include the cropped buffer in the result
          }

          if (squareWidth !== -1) {
            const grid = calculateGridDimensions(croppedWidth, croppedHeight, squareWidth)
            result.border = {
              totalBorderWidth: grid.totalHorizontalBorderWidth,
              singleBorderWidth: grid.singleBorderWidth,
            }

            console.log('Square width is', squareWidth)
            console.log('Single border width is', grid.singleBorderWidth)

            // Use cropped dimensions and data for square color identification
            const squareColors = identifySquareColors(
              croppedData,
              croppedWidth,
              croppedHeight,
              0, // Left boundary is now 0 in cropped image
              0, // Top boundary is now 0 in cropped image
              squareWidth,
              grid.singleBorderWidth,
            )
            result.squareColors = squareColors
            result.rowStrings = generateRowStrings(squareColors)
          } else {
            result.squareColors = null
            result.rowStrings = null
          }

          return resolve(result)
        })
        return // Exit after first valid boundary detection
      }

      resolve(null) // No boundaries found
    })
  })
}

// Example Usage
const run = async (buffer) => {
  try {
    const result = await getGuessKeys(buffer)
    if (result) {
      console.log(`Found boundaries at y = ${result.boundaries.y}px:`)
      console.log(`Left boundary: ${result.boundaries.leftBoundary}px`)
      console.log(`Right boundary: ${result.boundaries.rightBoundary}px`)
      console.log(`Top boundary: ${result.boundaries.topBoundary}px`)
      console.log(`Object width: ${result.object.width}px`)
      console.log(`Object height: ${result.object.height}px`)
      if (result.squareWidth !== -1) {
        console.log(`First square width: ${result.squareWidth}px`)
        console.log(`Total border width: ${result.border.totalBorderWidth}px`)
        console.log(`Each border width: ${result.border.singleBorderWidth}px`)
        console.log('Square colors by row:')
        result.squareColors.forEach(({ row, colors }) => {
          console.log(`Row ${row}:`)
          colors.forEach(({ square, color, x, y }) => {
            console.log(`  Square ${square} (sampled at x=${x}, y=${y}): ${color}`)
          })
        })
        console.log('Row color strings:')
        result.rowStrings.forEach(({ row, string }) => {
          console.log(`Row ${row}: ${string}`)
        })
      } else {
        console.log('Could not determine square width.')
      }
    } else {
      console.log('No object boundaries found in the image.')
    }
    return result
  } catch (err) {
    console.error('Error processing image:', err)
    throw err
  }
}

// Test with File (Optional)
const testWithFile = async () => {
  const fs = require('fs')
  const path = require('path')
  const filepath = path.join(__dirname, 'data', 'wordle_2.jpg')

  let buffer = fs.readFileSync(filepath)
  buffer = await preprocessImage(buffer)

  // save the preprocessed image for debug purposes

  const preprocessedFilePath = path.join(__dirname, 'data', 'wordle_2_preprocessed.png')
  // fs.writeFileSync(preprocessedFilePath, buffer)

  const result = await getGuessKeys(buffer)

  console.log(result)

  // save the new cropping for debug purposes

  const outputFilePath = path.join(__dirname, 'data', 'wordle_2_processed.png')
  fs.writeFileSync(outputFilePath, result.croppedBuffer)
  console.log(`Processed image saved to ${outputFilePath}`)
}

if (require.main === module) {
  testWithFile()
}

module.exports = { getGuessKeys }
