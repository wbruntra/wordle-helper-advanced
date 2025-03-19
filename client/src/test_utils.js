import { analyzeGuess } from './utils.js'

const run = () => {
  console.log('Hello!')
  const filteredList = [
    'AFARA',
    'AFARS',
    'AGARS',
    'GOARY',
    'GUARS',
    'HAARS',
    'HOARS',
    'HOARY',
    'KSARS',
    'KYARS',
    'MAARS',
    'OVARY',
    'PHARM',
    'QUARK',
    'ROAMS',
    'ROARS',
    'ROARY',
    'SHARK',
    'SHARP',
    'SMARM',
    'SOARS',
    'SPARK',
    'SPARS',
    'SWARF',
    'SWARM',
    'VOARS',
    'WHARF',
    'WHAUR',
    'YAARS',
  ]

  const guess = 'SHARK'

  const result = analyzeGuess(guess, filteredList)
  console.log('Result:', result)
}

run()