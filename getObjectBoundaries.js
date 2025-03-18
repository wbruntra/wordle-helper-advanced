const PNG = require('pngjs').PNG
const { getColorName } = require('./identifyColor')
const imageToPng = require('./imageToPng')

// Constants and Utilities
const COLORS = {
  BLACK: { r: 18, g: 18, b: 19, a: 255 },
  WHITE: { r: 255, g: 255, b: 255, a: 1 },
}

const generateColorMatcher = (refColor) => (r, g, b, a) =>
  r === refColor.r && g === refColor.g && b === refColor.b && a === refColor.a

const isBackgroundColor = generateColorMatcher(COLORS.BLACK)

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

  for (let x = 0; x < width; x++) {
    const { r, g, b, a } = getPixelColor(data, width, x, y)
    if (!isBackgroundColor(r, g, b, a)) {
      left = x
      break
    }
  }

  for (let x = width - 1; x >= 0; x--) {
    const { r, g, b, a } = getPixelColor(data, width, x, y)
    if (!isBackgroundColor(r, g, b, a)) {
      right = x
      break
    }
  }

  return { left, right }
}

function findTopBoundary(data, width, leftBoundary, startY) {
  for (let y = startY; y >= 0; y--) {
    const { r, g, b, a } = getPixelColor(data, width, leftBoundary, y)
    if (isBackgroundColor(r, g, b, a)) return y + 1
  }
  return 0
}

function findSquareWidth(data, width, leftBoundary, topBoundary) {
  let startBlack = -1
  let endBlack = -1

  for (let x = leftBoundary; x < width; x++) {
    const { r, g, b, a } = getPixelColor(data, width, x, topBoundary)
    if (isBackgroundColor(r, g, b, a)) {
      startBlack = x
      break
    }
  }

  if (startBlack === -1) return -1

  for (let x = startBlack + 1; x < width; x++) {
    const { r, g, b, a } = getPixelColor(data, width, x, topBoundary)
    if (!isBackgroundColor(r, g, b, a)) {
      endBlack = x
      break
    }
  }

  return endBlack === -1 ? -1 : startBlack - leftBoundary
}

function calculateGridDimensions(objectWidth, objectHeight, squareWidth) {
  const numSquares = 5
  const numRows = 6
  const totalHorizontalBorderWidth = objectWidth - numSquares * squareWidth
  const singleBorderWidth = Math.round(totalHorizontalBorderWidth / (numSquares - 1))
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
  const rowHeight = Math.round((height - topBoundary - (numRows - 1) * borderWidth) / numRows)

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
  return PNG.sync.write(cropped)
}

// Main Function
function findObjectBoundaries(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, png) => {
      if (err) return reject(err)

      const { width, height, data } = png
      const yStep = 25

      for (let y = 0; y < height; y += yStep) {
        const { left, right } = findHorizontalBoundaries(data, width, y, height)
        if (left === -1 || right === -1) continue

        const objectWidth = right - left + 1
        const topBoundary = findTopBoundary(data, width, left, y)
        const objectHeight = height - topBoundary
        const squareWidth = findSquareWidth(data, width, left, topBoundary)

        const result = {
          boundaries: { y, leftBoundary: left, rightBoundary: right, topBoundary },
          object: { width: objectWidth, height: objectHeight },
          squareWidth,
        }

        if (squareWidth !== -1) {
          const grid = calculateGridDimensions(objectWidth, objectHeight, squareWidth)
          result.border = {
            totalBorderWidth: grid.totalHorizontalBorderWidth,
            singleBorderWidth: grid.singleBorderWidth,
          }

          const squareColors = identifySquareColors(
            data,
            width,
            height,
            left,
            topBoundary,
            squareWidth,
            grid.singleBorderWidth,
          )
          result.squareColors = squareColors
          result.rowStrings = generateRowStrings(squareColors)
        } else {
          result.squareColors = null
          result.rowStrings = null
        }

        result.croppedBuffer = cropImage(
          data,
          width,
          height,
          left,
          topBoundary,
          objectWidth,
          objectHeight,
        )
        return resolve(result)
      }

      resolve(null) // No boundaries found
    })
  })
}

// Example Usage
const run = async (buffer) => {
  try {
    const result = await findObjectBoundaries(buffer)
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
      console.log('Cropped image buffer generated.')
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
  const filepath = path.join(__dirname, 'data', 'test.png')
  const buffer = fs.readFileSync(filepath)
  const result = await run(buffer)
  console.log(result)
}

if (require.main === module) {
  testWithFile()
}

module.exports = { findObjectBoundaries }
