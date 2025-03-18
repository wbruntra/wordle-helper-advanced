const OpenAI = require('openai')
const secrets = require('./secrets.js')
const openai = new OpenAI({
  apiKey: secrets.OPENAI_API_KEY,
})

const sampleResponse = [
  {
    word: 'CAGEY',
    key: '-Y---',
  },
  {
    word: 'STOMP',
    key: 'GG-GG',
  },
]

const getWordsGuessed = async (image_buffer) => {
  console.log('Getting words from ChatGPT...')

  const wordsExample = ['CAGEY', 'STOMP', 'WATER']

  const instructions = `The important part of the image contains a prominent display of up to six rows of 5-letter words. Each square has a specific background color. Your task is to identify the word in each row. Your response should be in this format: ${JSON.stringify(
    wordsExample,
  )}.`

  const base64Image = image_buffer.toString('base64')

  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: instructions,
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'guess_response',
        schema: {
          type: 'object',
          properties: {
            words: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['words'],
          additionalProperties: false,
        },
      },
    },
  })

  let output_text = response.output_text

  return JSON.parse(output_text).words
}

const getResponse = async (image_url) => {
  console.log('Getting response...')

  const instructions = `You are to act as a Wordle analysis assistant. The user has uploaded an image containing rows of 5-letter words, where each word is displayed with its individual letters divided into squares, with a small gap between each letter. Each square has a specific background color. Your task is to process the image and extract the following information:

  Identify the word in each row.

For each letter, determine the background color of the square it's in.

The square background colors will be yellow, green, or some neutral color (for example black or gray).

Please process the image, extract each letter, and note the background color associated with each letter's square, whether it is Green (G), Yellow (Y), or some other color (-).

The response should correspond to this format ${JSON.stringify(
    sampleResponse,
  )}, where Y represents yellow, G represents green, and - represents a neutral color.
`

  return openai.responses.create({
    model: 'gpt-4o-2024-08-06',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: instructions,
          },
          {
            type: 'input_image',
            image_url: image_url,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'guess_response',
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: {
                    type: 'string',
                  },
                  key: {
                    type: 'string',
                  },
                },
                required: ['word', 'key'],
                additionalProperties: false,
              },
            },
          },
          required: ['data'],
          additionalProperties: false,
        },
      },
    },
  })
}

const test = async () => {
  const test_image = 'https://test-projects.us-east-1.linodeobjects.com/new_test.jpeg'

  const words = await getWordsGuessed(test_image)

  console.log(words)
}

const getGuessesFromImage = async (image_url) => {
  const response = await getResponse(image_url)

  let output_text = response.output_text

  console.log('ChatGPT response', output_text)

  const output = JSON.parse(output_text)

  const guesses = output.data.map((g) => {
    return {
      word: g.word.slice(0, 5),
      key: g.key.slice(0, 5),
    }
  })

  return output.data
}

if (require.main === module) {
  test().then(() => {
    process.exit(0)
  })
}

module.exports = { getGuessesFromImage, getWordsGuessed }
