const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const imageToPng = async (buffer) => {
  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    if (metadata.format === 'png') {
      return buffer
    }
    return image.png().toBuffer()
  } catch (error) {
    console.error('Error converting image to PNG:', error)
    throw error
  }
}

const test = async () => {
  const filepath = path.join(__dirname, 'data', 'new_test.jpeg')
  const buffer = fs.readFileSync(filepath)

  const result = await imageToPng(buffer)
  console.log(result)
}

if (require.main === module) {
  test()
}

module.exports = imageToPng
