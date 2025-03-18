const PNG = require('pngjs').PNG
const { getColorName } = require('./identifyColor')

// Constants and Utilities
const COLORS = {
  BLACK: { r: 18, g: 18, b: 19, a: 255 },
  WHITE: { r: 255, g: 255, b: 255, a: 1 },
};

const generateColorMatcher = (refColor) => (r, g, b, a) =>
  r === refColor.r && g === refColor.g && b === refColor.b && a === refColor.a;

const isBackgroundColor = generateColorMatcher(COLORS.BLACK);

// Function to scan a specific row for boundaries
function scanRow(data, width, y, height) {
  let leftBoundary = -1
  let rightBoundary = -1

  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    if (!isBackgroundColor(r, g, b, a)) {
      leftBoundary = x
      break
    }
  }

  for (let x = width - 1; x >= 0; x--) {
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    if (!isBackgroundColor(r, g, b, a)) {
      rightBoundary = x
      break
    }
  }

  return { leftBoundary, rightBoundary }
}

// Function to find the top boundary
function findTopBoundary(data, width, leftBoundary, startY) {
  for (let y = startY; y >= 0; y--) {
    const idx = (y * width + leftBoundary) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    if (isBackgroundColor(r, g, b, a)) {
      return y + 1
    }
  }
  return 0
}

// Function to find the width of the first square
function findSquareWidth(data, width, leftBoundary, topBoundary) {
  let startBlack = -1
  let endBlack = -1

  for (let x = leftBoundary; x < width; x++) {
    const idx = (topBoundary * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    if (isBackgroundColor(r, g, b, a)) {
      startBlack = x
      break
    }
  }

  if (startBlack === -1) return -1

  for (let x = startBlack + 1; x < width; x++) {
    const idx = (topBoundary * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]

    if (!isBackgroundColor(r, g, b, a)) {
      endBlack = x
      break
    }
  }

  if (endBlack === -1) return -1

  return startBlack - leftBoundary
}

// Function to identify colors of all squares in all rows
function identifySquareColors(
  data,
  width,
  height,
  leftBoundary,
  topBoundary,
  squareWidth,
  singleBorderWidth,
) {
  const squareColors = []
  const offsetX = 6
  const offsetY = 6
  const numRows = 6
  const rowHeight = Math.round(
    (height - topBoundary - (numRows - 1) * singleBorderWidth) / numRows,
  )

  for (let row = 0; row < numRows; row++) {
    const rowColors = []
    const sampleY = topBoundary + row * (rowHeight + singleBorderWidth) + offsetY

    for (let i = 0; i < 5; i++) {
      const squareStartX = leftBoundary + i * squareWidth + i * singleBorderWidth
      const sampleX = squareStartX + offsetX

      if (sampleX >= width || sampleY >= height) {
        rowColors.push({ square: i + 1, color: 'Out of bounds', x: sampleX, y: sampleY })
        continue
      }

      const idx = (sampleY * width + sampleX) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const color = getColorName(r, g, b)
      rowColors.push({ square: i + 1, color, x: sampleX, y: sampleY })
    }
    squareColors.push({ row: row + 1, colors: rowColors })
  }

  return squareColors
}

// Main function to process a buffer and return results
function findObjectBoundaries(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, png) => {
      if (err) {
        reject(err)
        return
      }

      const width = png.width
      const height = png.height
      const data = png.data
      let y = 0
      const yStep = 25

      while (y < height) {
        const { leftBoundary, rightBoundary } = scanRow(data, width, y, height)

        if (leftBoundary !== -1 && rightBoundary !== -1) {
          const objectWidth = rightBoundary - leftBoundary + 1
          const topBoundary = findTopBoundary(data, width, leftBoundary, y)
          const objectHeight = height - topBoundary
          const squareWidth = findSquareWidth(data, width, leftBoundary, topBoundary)
          const totalBorderWidth = objectWidth - 5 * squareWidth
          const singleBorderWidth = Math.round(totalBorderWidth / 4)

          let result = {
            boundaries: { y, leftBoundary, rightBoundary, topBoundary },
            object: { width: objectWidth, height: objectHeight },
            squareWidth,
            border: { totalBorderWidth, singleBorderWidth },
          }

          if (squareWidth !== -1) {
            const squareColors = identifySquareColors(
              data,
              width,
              height,
              leftBoundary,
              topBoundary,
              squareWidth,
              singleBorderWidth,
            )
            result.squareColors = squareColors

            // Generate 5-character strings for each row
            result.rowStrings = squareColors.map(({ row, colors }) => {
              const hasBlack = colors.some((c) => c.color.toLowerCase() === 'black')
              if (hasBlack) return { row, string: null }

              const colorString = colors
                .map((c) => {
                  switch (c.color.toUpperCase()) {
                    case 'G':
                      return 'G' // Green
                    case 'Y':
                      return 'Y' // Yellow
                    case '-':
                      return '-' // Gray
                    default:
                      return '-' // Default to gray for unknown colors
                  }
                })
                .join('')
              return { row, string: colorString }
            })
          } else {
            result.squareColors = null
            result.rowStrings = null
          }

          // Return the cropped buffer instead of saving to disk
          const cropped = new PNG({ width: objectWidth, height: objectHeight })
          for (let yCrop = 0; yCrop < objectHeight; yCrop++) {
            for (let x = 0; x < objectWidth; x++) {
              const sourceIdx = ((topBoundary + yCrop) * width + (leftBoundary + x)) * 4
              const destIdx = (yCrop * objectWidth + x) * 4

              cropped.data[destIdx] = data[sourceIdx]
              cropped.data[destIdx + 1] = data[sourceIdx + 1]
              cropped.data[destIdx + 2] = data[sourceIdx + 2]
              cropped.data[destIdx + 3] = data[sourceIdx + 3]
            }
          }

          result.croppedBuffer = PNG.sync.write(cropped)
          resolve(result)
          return
        }

        y += yStep
      }

      resolve(null) // No boundaries found
    })
  })
}

// Example usage with a buffer
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
      // Optionally, you could save the buffer to disk here if needed:
      // require('fs').writeFileSync('cropped_output.png', result.croppedBuffer);
    } else {
      console.log('No object boundaries found in the image.')
    }
    return result
  } catch (err) {
    console.error('Error processing image:', err)
    throw err
  }
}

// Example: If you still want to test with a file
const testWithFile = async () => {
  const fs = require('fs')
  const path = require('path')
  const filepath = path.join(__dirname, 'data', 'test.png')
  const buffer = fs.readFileSync(filepath)
  const result = await run(buffer)

  console.log(result)
}

if (require.main === module) {
  // Run the example with a buffer
  testWithFile()
}

module.exports = { findObjectBoundaries }