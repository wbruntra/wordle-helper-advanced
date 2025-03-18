const fs = require('fs')
const PNG = require('pngjs').PNG
const path = require('path')
const { identifyColor, getColorName } = require('./identifyColor')

const generateBackgroundMatcher = (referenceBackground) => {
  return (r, g, b, a) => {
    return (
      r === referenceBackground.r &&
      g === referenceBackground.g &&
      b === referenceBackground.b &&
      a === referenceBackground.a
    )
  }
}

// Function to check if a pixel matches rgba(18, 18, 19, 1)
const referenceBlack = {
  r: 18,
  g: 18,
  b: 19,
  a: 255,
}

const referenceWhite = {
  r: 255,
  g: 255,
  b: 255,
  a: 1,
}

const isBackgroundColor = generateBackgroundMatcher(referenceBlack)

// Function to scan a specific row (y-value) for boundaries
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

// New function to find the width of the first square
function findSquareWidth(data, width, leftBoundary, topBoundary) {
  let startBlack = -1
  let endBlack = -1

  // Scan right from (leftBoundary, topBoundary) to find the first black pixel
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

  // If no black pixel is found, return -1
  if (startBlack === -1) {
    return -1
  }

  // Continue right to find the end of the black border
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

  // If no end is found, assume the border goes to the edge (unlikely, but handle it)
  if (endBlack === -1) {
    return -1
  }

  // The width of the square is the distance from leftBoundary to startBlack
  return startBlack - leftBoundary
}

// Main function to find boundaries and crop
function findObjectBoundaries(filePath) {
  fs.createReadStream(filePath)
    .pipe(new PNG())
    .on('parsed', function () {
      const width = this.width
      const height = this.height
      const data = this.data
      let y = 0
      const yStep = 25

      while (y < height) {
        const { leftBoundary, rightBoundary } = scanRow(data, width, y, height)

        if (leftBoundary !== -1 && rightBoundary !== -1) {
          const objectWidth = rightBoundary - leftBoundary + 1
          const topBoundary = findTopBoundary(data, width, leftBoundary, y)
          const objectHeight = height - topBoundary

          // Find the width of the first square
          const squareWidth = findSquareWidth(data, width, leftBoundary, topBoundary)
          const totalBorderWidth = objectWidth - 5 * squareWidth
          const singleBorderWidth = Math.round(totalBorderWidth / 4)

          console.log(`Found boundaries at y = ${y}px:`)
          console.log(`Left boundary: ${leftBoundary}px`)
          console.log(`Right boundary: ${rightBoundary}px`)
          console.log(`Top boundary: ${topBoundary}px`)
          console.log(`Object width: ${objectWidth}px`)
          console.log(`Object height: ${objectHeight}px`)
          if (squareWidth !== -1) {
            console.log(`First square width: ${squareWidth}px`)
            console.log(`So of the total image, the borders occupy ${totalBorderWidth}px`)
            console.log(`And each border is ${singleBorderWidth}px wide`)
          } else {
            console.log('Could not determine square width.')
          }

          // Crop the image
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

          const outputFilePath = path.join(__dirname, 'data', 'cropped_object.png')
          cropped
            .pack()
            .pipe(fs.createWriteStream(outputFilePath))
            .on('finish', () => {
              console.log(`Cropped image saved to ${outputFilePath}`)
            })

          return
        }

        console.log(`No boundaries found at y = ${y}px, trying next row...`)
        y += yStep
      }

      console.log('No object boundaries found in the entire image.')
    })
    .on('error', function (err) {
      console.error('Error processing image:', err)
    })
}

const run = () => {
  const filepath = path.join(__dirname, 'data', 'test.png')
  findObjectBoundaries(filepath)
}

run()
