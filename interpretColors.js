const sharp = require('sharp')
const Tesseract = require('tesseract.js')
const fs = require('fs')
const path = require('path')

const imagePath = './data/test_3.png'

async function processWordleImage() {
  try {
    // Load the image
    console.log(`Processing image: ${imagePath}`)
    const image = sharp(imagePath)
    const metadata = await image.metadata()
    console.log(`Image dimensions: ${metadata.width}x${metadata.height}`)

    // Create debug directory if it doesn't exist
    const debugDir = path.join(__dirname, 'debug')
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir)
    }

    // Extract main game area using pixel analysis instead of edge detection
    // This is more reliable as Wordle has consistent colors
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
    const width = info.width
    const height = info.height

    // Sample points to identify the game grid
    const samples = []
    const sampleSize = 10 // pixels to sample

    // Sample across the image to find game grid based on color transitions
    for (let y = 0; y < height; y += height / 20) {
      for (let x = 0; x < width; x += width / 20) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 3
        if (idx + 2 < data.length) {
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          // Store RGB values and coordinates
          samples.push({ x: Math.floor(x), y: Math.floor(y), r, g, b })
        }
      }
    }

    // Look for the dark background of Wordle grid
    const gridSamples = samples.filter((s) => {
      // Match the typical dark Wordle grid background
      return s.r < 60 && s.g < 60 && s.b < 60
    })

    if (gridSamples.length === 0) {
      throw new Error('Could not identify Wordle grid in the image')
    }

    // Find grid boundaries
    let minX = Math.min(...gridSamples.map((s) => s.x))
    let maxX = Math.max(...gridSamples.map((s) => s.x))
    let minY = Math.min(...gridSamples.map((s) => s.y))
    let maxY = Math.max(...gridSamples.map((s) => s.y))

    const padding = 0
    minX = Math.max(0, minX - padding)
    maxX = Math.min(width, maxX + padding)
    minY = Math.max(0, minY - padding)
    maxY = Math.min(height, maxY + padding)

    const gridWidth = maxX - minX
    const gridHeight = maxY - minY

    console.log(
      `Detected grid: (${minX},${minY}) to (${maxX},${maxY}), size: ${gridWidth}x${gridHeight}`,
    )

    // Extract the grid area and save for debugging
    await image
      .extract({ left: minX, top: minY, width: gridWidth, height: gridHeight })
      .png()
      .toFile(path.join(debugDir, 'grid.png'))

    // Estimate cell dimensions (Wordle has 5x6 grid)
    const cellWidth = Math.floor(gridWidth / 5)
    const cellHeight = Math.floor(gridHeight / 6)

    console.log(`Estimated cell size: ${cellWidth}x${cellHeight}`)

    const results = []

    for (let row = 0; row < 6; row++) {
      const rowResults = []
      for (let col = 0; col < 5; col++) {
        const cellX = minX + col * cellWidth
        const cellY = minY + row * cellHeight

        // Add a small margin inside each cell to avoid borders
        const margin = Math.floor(cellWidth * 0.1) // 10% margin
        const extractX = cellX + margin
        const extractY = cellY + margin
        const extractWidth = cellWidth - 2 * margin
        const extractHeight = cellHeight - 2 * margin

        // Skip if dimensions are invalid
        if (extractWidth <= 0 || extractHeight <= 0) {
          console.log(`Skipping cell [${row}, ${col}] - invalid dimensions`)
          rowResults.push({ letter: '', color: 'unknown', row, col })
          continue
        }

        try {
          // Extract cell image
          const cellBuffer = await image
            .extract({
              left: extractX,
              top: extractY,
              width: extractWidth,
              height: extractHeight,
            })
            .toBuffer()

          // Save cell image for debugging
          // await sharp(cellBuffer)
          //   .png()
          //   .toFile(path.join(debugDir, `cell_${row}_${col}.png`))

          // Analyze cell color
          const { data: cellData, info: cellInfo } = await sharp(cellBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true })

          // Average the colors in the cell
          let rSum = 0,
            gSum = 0,
            bSum = 0
          const pixelCount = cellData.length / 3

          for (let i = 0; i < cellData.length; i += 3) {
            rSum += cellData[i]
            gSum += cellData[i + 1]
            bSum += cellData[i + 2]
          }

          const rAvg = rSum / pixelCount
          const gAvg = gSum / pixelCount
          const bAvg = bSum / pixelCount

          console.log(
            `Cell [${row}, ${col}] avg RGB: (${Math.round(rAvg)}, ${Math.round(
              gAvg,
            )}, ${Math.round(bAvg)})`,
          )

          // Determine cell color and letter
          let color = 'gray' // Default to gray (absent)

          // Detect green (correct position)
          if (gAvg > 100 && rAvg < 100 && bAvg < 100) {
            color = 'green'
          }
          // Detect yellow (correct letter, wrong position)
          else if (rAvg > 100 && gAvg > 100 && bAvg < 100) {
            color = 'yellow'
          }
          // Detect if the cell is empty (not filled yet)
          else if (rAvg < 30 && gAvg < 30 && bAvg < 30) {
            color = 'empty'
          }

          // Only perform OCR if the cell is not empty
          let letter = ''
          if (color !== 'empty') {
            // Convert to grayscale and increase contrast for better OCR
            const processedCellBuffer = await sharp(cellBuffer).grayscale().normalise().toBuffer()

            // Save processed cell for debugging
            // await sharp(processedCellBuffer)
            //   .png()
            //   .toFile(path.join(debugDir, `cell_${row}_${col}_processed.png`))

            // Perform OCR
            const { data: ocrData } = await Tesseract.recognize(processedCellBuffer, 'eng', {
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
              tessedit_pageseg_mode: '10', // Treat as single character
            })

            letter = ocrData.text.trim().toUpperCase().charAt(0) || ''
            console.log(
              `Cell [${row}, ${col}]: OCR result = "${ocrData.text.trim()}", using letter = "${letter}"`,
            )
          }

          rowResults.push({ letter, color, row, col })
        } catch (cellError) {
          console.error(`Error processing cell [${row}, ${col}]:`, cellError)
          rowResults.push({ letter: '', color: 'error', row, col })
        }
      }
      results.push(rowResults)
    }

    // Format results as Wordle guesses
    console.log('\nDetected Wordle Guesses:')
    const formattedResults = results
      .filter((row) =>
        row.some((cell) => cell.letter !== '' && cell.color !== 'empty' && cell.color !== 'error'),
      )
      .map((row) => {
        const word = row.map((cell) => cell.letter).join('')
        const colors = row
          .map((cell) => {
            if (cell.color === 'green') return 'C' // Correct
            if (cell.color === 'yellow') return 'P' // Present
            return 'A' // Absent
          })
          .join('')

        return { word, colors }
      })

    console.log(formattedResults)
    return formattedResults
  } catch (error) {
    console.error('Error processing Wordle image:', error)
    throw error
  }
}

processWordleImage().catch(console.error)
