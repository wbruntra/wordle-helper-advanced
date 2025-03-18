const { getWordsGuessed } = require('./getGuessesFromImage')
const { getGuessKeys } = require('./getObjectBoundaries')
const preprocessImage = require('./preprocessImage')
const axios = require('axios')

const getGuesses = async (image_url) => {
  const response = await axios.get(image_url, {
    responseType: 'arraybuffer',
  })

  const buffer = Buffer.from(response.data, 'binary')

  const preprocessedBuffer = await preprocessImage(buffer)
  const guessKeys = await getGuessKeys(preprocessedBuffer)
  const words = await getWordsGuessed(guessKeys.croppedBuffer)
  // console.log(guessKeys)
  // return

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
  const result = getGuesses(test_image)

  console.log(result)
}

if (require.main === module) {
  test().then(() => {
    process.exit(0)
  })
}

module.exports = { getGuesses }
