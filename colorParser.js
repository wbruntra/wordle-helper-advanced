// Correct import for Jimp
const { Jimp } = require('jimp')
const { createWorker } = require('tesseract.js')
const { intToRGBA } = require('@jimp/utils')
const { JimpMime } = require('jimp')
async function parseWordleGrid(screenshotPath) {
  try {
    // Load the image - corrected method
    const image = await Jimp.read(screenshotPath)

    // Determine grid dimensions
    const width = image.width
    const height = image.height

    console.log(`Image dimensions: ${width}x${height}`)
    // console.log(image)
    // return

    // Define color ranges for detection
    const colorRanges = {
      green: { r: [75, 85], g: [135, 150], b: [70, 80] },
      yellow: { r: [180, 255], g: [150, 220], b: [0, 100] },
      gray: { r: [50, 100], g: [50, 100], b: [50, 100] },
    }

    // Initialize OCR worker
    const worker = await createWorker()

    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      tessjs_create_box: '1',
    })

    // Estimate cell size and margin based on image size
    const estimatedRows = 6
    const estimatedCols = 5
    const cellWidth = Math.floor(width / estimatedCols)
    const cellHeight = Math.floor(height / estimatedRows)

    // Store the parsed grid
    const grid = []

    // Process each row
    for (let row = 0; row < estimatedRows; row++) {
      const gridRow = []

      // Process each column
      for (let col = 0; col < estimatedCols; col++) {
        const cellX = col * cellWidth
        const cellY = row * cellHeight

        // return

        // Extract the cell
        console.log(`Processing cell [${row}, ${col}] at (${cellX}, ${cellY})`)
        const cell = image.clone().crop({
          x: cellX,
          y: cellY,
          w: cellWidth,
          h: cellHeight,
        })

        // Determine background color by sampling center pixel
        const centerX = Math.floor(cellWidth / 5)
        const centerY = Math.floor(cellHeight / 5)
        const { r, g, b } = intToRGBA(cell.getPixelColor(centerX, centerY))

        // Determine letter state based on background color
        let state = 'empty'
        if (r > 10 || g > 10 || b > 10) {
          // Not a black/empty cell
          if (isInColorRange(r, g, b, colorRanges.green)) {
            state = 'correct'
          } else if (isInColorRange(r, g, b, colorRanges.yellow)) {
            state = 'present'
          } else if (isInColorRange(r, g, b, colorRanges.gray)) {
            state = 'absent'
          }
        }

        // If cell is not empty, recognize the letter
        let letter = ''
        if (state !== 'empty') {
          // Preprocess the cell for better OCR
          cell.greyscale().contrast(0.8)

          console.log()

          // Convert to buffer for tesseract
          const buffer = await cell.getBuffer(JimpMime.png)

          // Recognize the letter
          const { data } = await worker.recognize(buffer)
          letter = data.text.trim().toUpperCase()

          // Take the first character if multiple are detected
          if (letter.length > 0) {
            letter = letter[0]
          }
        }

        gridRow.push({
          letter,
          state,
        })
      }

      grid.push(gridRow)
    }

    // Terminate OCR worker
    await worker.terminate()

    return grid
  } catch (error) {
    console.error('Error parsing Wordle grid:', error)
    throw error
  }
}

// Helper function to check if a color is within a specified range
function isInColorRange(r, g, b, range) {
  return (
    r >= range.r[0] &&
    r <= range.r[1] &&
    g >= range.g[0] &&
    g <= range.g[1] &&
    b >= range.b[0] &&
    b <= range.b[1]
  )
}

// Example usage
async function main() {
  try {
    const gridData = await parseWordleGrid('./data/test_3.png')

    // Pretty print the grid
    console.log('Parsed Wordle Grid:')
    gridData.forEach((row) => {
      const rowDisplay = row
        .map((cell) => {
          if (cell.letter) {
            let colorCode
            switch (cell.state) {
              case 'correct':
                colorCode = '\x1b[32m'
                break // Green
              case 'present':
                colorCode = '\x1b[33m'
                break // Yellow
              case 'absent':
                colorCode = '\x1b[90m'
                break // Gray
              default:
                colorCode = '\x1b[37m' // White
            }
            return `${colorCode}${cell.letter}\x1b[0m`
          }
          return ' '
        })
        .join(' ')
      console.log(rowDisplay)
    })

    // Output structured data
    // console.log('\nStructured Data:')
    // console.log(JSON.stringify(gridData, null, 2))
  } catch (error) {
    console.error('Main execution error:', error)
  }
}

// Call the main function
main()
