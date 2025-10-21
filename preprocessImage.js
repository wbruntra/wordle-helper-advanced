const PNG = require('pngjs').PNG
const fs = require('fs')
const path = require('path')
const { getPixelColor, isColorMatch, colorIsBlack } = require('./backendUtils')
const imageToPng = require('./imageToPng')
const sharp = require('sharp')

// Function to find the end of the second non-black group, or the first if only one exists
function findKeyNonBlackGroup(data, width, height) {
  let groupCount = 0
  let inNonBlackGroup = false
  let firstGroupEndY = -1 // Track the end of the first group
  let secondGroupEndY = -1 // Track the end of the second group

  const heightLimit = height * 0.5

  for (let y = 0; y < heightLimit; y++) {
    let isSolidLine = true
    let isLineBlack = true

    // Check if the entire line is solid and determine if it is black
    const { r: firstR, g: firstG, b: firstB } = getPixelColor(data, width, 0, y)
    const skipFirstPixels = 6

    for (let x = skipFirstPixels; x < width - skipFirstPixels; x++) {
      const { r, g, b } = getPixelColor(data, width, x, y)
      if (!isColorMatch({ r: firstR, g: firstG, b: firstB }, r, g, b, 18)) {
        isSolidLine = false
        break
      }
    }

    if (isSolidLine) {
      isLineBlack = colorIsBlack(firstR, firstG, firstB)
    } else {
      isLineBlack = false // If the line is not solid, it cannot be black
    }

    if (!isLineBlack && isSolidLine) {
      // Start of a new non-black group
      if (!inNonBlackGroup) {
        inNonBlackGroup = true
        groupCount++
      }

      // Track the end of the current group
      let groupEndY = y

      // Continue until the group ends (i.e., lines become black or non-solid again)
      while (groupEndY < height) {
        let isGroupLineBlack = true
        let isGroupLineSolid = true

        const {
          r: groupFirstR,
          g: groupFirstG,
          b: groupFirstB,
        } = getPixelColor(data, width, 0, groupEndY)
        for (let x = 1; x < width; x++) {
          const { r, g, b } = getPixelColor(data, width, x, groupEndY)
          if (r !== groupFirstR || g !== groupFirstG || b !== groupFirstB) {
            isGroupLineSolid = false
            break
          }
        }

        if (isGroupLineSolid) {
          isGroupLineBlack = colorIsBlack(groupFirstR, groupFirstG, groupFirstB)
        } else {
          isGroupLineBlack = false // If the line is not solid, it cannot be black
        }

        if (isGroupLineBlack || !isGroupLineSolid) break
        groupEndY++
      }

      // Update the end of the group based on group count
      if (groupCount === 1) {
        firstGroupEndY = groupEndY
      } else if (groupCount === 2) {
        secondGroupEndY = groupEndY
        return secondGroupEndY // Return immediately when second group is found
      }

      y = groupEndY // Skip to the end of the current group
    } else {
      // End of a non-black group
      inNonBlackGroup = false
    }
  }

  // If only one group was found, return its end; otherwise, return -1
  return firstGroupEndY !== -1 ? firstGroupEndY : -1
}

// Function to find the second group of lines that are not black
function findSecondNonBlackGroup(data, width, height) {
  let groupCount = 0
  let inNonBlackGroup = false

  const heightLimit = height * 0.5

  for (let y = 0; y < heightLimit; y++) {
    let isSolidLine = true
    let isLineBlack = true

    // Check if the entire line is solid and determine if it is black
    const { r: firstR, g: firstG, b: firstB } = getPixelColor(data, width, 0, y)
    const skipFirstPixels = 6

    for (let x = skipFirstPixels; x < width - skipFirstPixels; x++) {
      const { r, g, b } = getPixelColor(data, width, x, y)
      if (!isColorMatch({ r: firstR, g: firstG, b: firstB }, r, g, b, 18)) {
        isSolidLine = false
        break
      }
    }

    if (isSolidLine) {
      isLineBlack = colorIsBlack(firstR, firstG, firstB)
    } else {
      isLineBlack = false // If the line is not solid, it cannot be black
    }

    if (!isLineBlack && isSolidLine) {
      // Start of a new non-black group
      if (!inNonBlackGroup) {
        inNonBlackGroup = true
        groupCount++
      }

      // If this is the second non-black group, return the Y-coordinate of the last line in the group
      if (groupCount === 2) {
        let groupEndY = y

        // Continue until the group ends (i.e., lines become black again)
        while (groupEndY < height) {
          let isGroupLineBlack = true
          let isGroupLineSolid = true

          const {
            r: groupFirstR,
            g: groupFirstG,
            b: groupFirstB,
          } = getPixelColor(data, width, 0, groupEndY)
          for (let x = 1; x < width; x++) {
            const { r, g, b } = getPixelColor(data, width, x, groupEndY)
            if (r !== groupFirstR || g !== groupFirstG || b !== groupFirstB) {
              isGroupLineSolid = false
              break
            }
          }

          if (isGroupLineSolid) {
            isGroupLineBlack = colorIsBlack(groupFirstR, groupFirstG, groupFirstB)
          } else {
            isGroupLineBlack = false // If the line is not solid, it cannot be black
          }

          if (isGroupLineBlack) break
          groupEndY++
        }

        return groupEndY // Return the Y-coordinate of the last line in the second group
      }
    } else {
      // End of a non-black group
      inNonBlackGroup = false
    }
  }

  return -1 // Return -1 if no second non-black group is found
}

// Function to crop the image below the specified line
function cropBelowLine(buffer, lineY) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, png) => {
      if (err) return reject(err)

      const { width, height, data } = png

      if (lineY < 0 || lineY >= height) {
        return reject(new Error('Invalid lineY for cropping.'))
      }

      const croppedHeight = height - lineY - 1
      const croppedWidth = width - 5 // Remove the first 5 pixels from the left
      const cropped = new PNG({ width: croppedWidth, height: croppedHeight })

      for (let y = 0; y < croppedHeight; y++) {
        for (let x = 0; x < croppedWidth; x++) {
          const sourceIdx = ((lineY + 1 + y) * width + (x + 5)) * 4 // Start at x = 5
          const destIdx = (y * croppedWidth + x) * 4

          cropped.data[destIdx] = data[sourceIdx]
          cropped.data[destIdx + 1] = data[sourceIdx + 1]
          cropped.data[destIdx + 2] = data[sourceIdx + 2]
          cropped.data[destIdx + 3] = data[sourceIdx + 3]
        }
      }

      const outputBuffer = PNG.sync.write(cropped)
      resolve(outputBuffer)
    })
  })
}

// Pre-process the image to crop below the second non-black group
async function preprocessImage(buffer) {
  // ensure format is PNG
  buffer = await imageToPng(buffer)

  try {
    const png = PNG.sync.read(buffer)
    const { width, height, data } = png

    // Find the second non-black group
    const secondGroupEndY = findKeyNonBlackGroup(data, width, height)
    if (secondGroupEndY === -1) {
      throw new Error('Second non-black group not found.')
    }

    console.log(`Second non-black group ends at Y = ${secondGroupEndY}`)

    // Crop the image below the second non-black group
    const croppedBuffer = await cropBelowLine(buffer, secondGroupEndY + 5)

    return croppedBuffer
  } catch (error) {
    console.error('Error during pre-processing:', error)
  }
}

// Example usage
const testPreprocessing = async () => {
  const inputFilePath = path.join(__dirname, 'data', 'ios_test.png')

  let buffer = fs.readFileSync(inputFilePath)

  // jpeg to png
  buffer = await imageToPng(buffer)

  // const metadata = await sharp(buffer).metadata()
  // console.log(metadata)

  // return

  const result = await preprocessImage(buffer)

  const outputFilePath = path.join(__dirname, 'data', 'ios_test_result.png')
  fs.writeFileSync(outputFilePath, result)
  console.log(`Processed image saved to ${outputFilePath}`)
}

if (require.main === module) {
  testPreprocessing()
}

module.exports = preprocessImage
