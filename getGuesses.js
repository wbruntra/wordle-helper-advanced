const { getWordsGuessed } = require('./getGuessesFromImage')
const { getGuessKeys } = require('./getObjectBoundaries')
const preprocessImage = require('./preprocessImage')
const axios = require('axios')
const convertToBlackAndWhite = require('./convertToBW')
const fs = require('fs')
const path = require('path')

const getGuessesFromBuffer = async (buffer) => {
  const preprocessedBuffer = await preprocessImage(buffer)
  const guessKeys = await getGuessKeys(preprocessedBuffer)
  const bwBuffer = convertToBlackAndWhite(guessKeys.croppedBuffer)

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

const getGuesses = async (image_url) => {
  // Validate the image_url parameter
  if (!image_url || typeof image_url !== 'string') {
    throw new Error('image_url is required and must be a valid URL string')
  }

  // Basic URL validation
  try {
    new URL(image_url)
  } catch (error) {
    throw new Error(`Invalid URL provided: ${image_url}`)
  }

  console.log('Fetching image from URL:', image_url)

  const response = await axios.get(image_url, {
    responseType: 'arraybuffer',
  })

  const buffer = Buffer.from(response.data, 'binary')

  const result = await getGuessesFromBuffer(buffer)

  return result
}

const test = async () => {
  const test_image = 'https://test-projects.us-east-1.linodeobjects.com/new_test.jpeg'

  // const inputFilePath = path.join(__dirname, 'data', 'ios_test.png')
  // let buffer = fs.readFileSync(inputFilePath)

  // const result = await getGuessesFromBuffer(buffer)


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
