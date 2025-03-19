const { getWordsGuessed } = require('./getGuessesFromImage')
const { getGuessKeys } = require('./getObjectBoundaries')
const preprocessImage = require('./preprocessImage')
const axios = require('axios')
const convertToBlackAndWhite = require('./convertToBW')
const fs = require('fs')
const path = require('path')

const getGuesses = async (image_url) => {
  const response = await axios.get(image_url, {
    responseType: 'arraybuffer',
  })

  const buffer = Buffer.from(response.data, 'binary')

  const preprocessedBuffer = await preprocessImage(buffer)
  const guessKeys = await getGuessKeys(preprocessedBuffer)

  const bwBuffer = convertToBlackAndWhite(guessKeys.croppedBuffer)
  // Save the black and white image for debugging
  // const debugDir = path.join(__dirname, 'debug')
  // const bwImagePath = path.join(debugDir, 'black_and_white.png')
  // fs.writeFileSync(bwImagePath, bwBuffer)

  const words = await getWordsGuessed(bwBuffer)

  const keys = guessKeys.rowStrings

  console.log(words, keys)

  let result = words.map((word, index) => {
    return {
      word,
      key: keys[index].string,
    }
  })

  console.log(result)
  return result
}

const test = async () => {
  const test_image = 'https://test-projects.us-east-1.linodeobjects.com/new_test.jpeg'
  // const test_image = 'https://test-projects.us-east-1.linodeobjects.com/wordle/sTKqQewZ.jpg'
  const result = await getGuesses(test_image)

  console.log(result)
}

if (require.main === module) {
  test().then(() => {
    process.exit(0)
  })
}

module.exports = { getGuesses }
