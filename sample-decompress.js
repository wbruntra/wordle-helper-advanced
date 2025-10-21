const { decompress, compress } = require('@advancedUtils')
const likelyWords = require('./likely-word-list.json')
const fs = require('fs')

const testString = `AbackSeTeBeyOtHorIdeLedOdeRtUtVeUseYssChedSOrnResIdTedOrUteDagePtDedEptIeuMinTObePtReNUltFfixIreOotUlTerGainPeTeEntIleNgLowOnyRaReeHeadOldIdedRSMedRedSleLarmBumErtGaeIasBiEnGnKeVeLayEyOtWYOftNeGOfUdPhaTarErMassZeBerLeEndIssTyOngPleYUseNgelRLeRyStImeKleNexOyUlOdeTicSyVilOrtaPaceRtHidIngNeaPleYRonTlyRborCedDorEasNaGueIseMedOrOmaSeRayOwSonTsyScotHenSIdeKedWPenSayEsTTlasOllMsNeTicUdioTGhtUrNtsYVailErtIanOidWaitKeRdEShFulOkeXialOmNLesZureBabelSCksOnDgeLyGelGyKedRLerSLsMyNalDsGsJoKsRbsEdGeKsNsOnSalEdSIcLNSTeTchEdHeSOnTyWdyYouEachDsYKsMsNsRdSStTsEchFyPsRsTsFitGanTEtInUnIgeNgLchIeLeSYOwTsNchDsNyRetRyThSetTelVelZelIbleCepDdyEdGotKerSLgeLs`

console.log('Decompressed word list:')
const wordList = decompress(testString)
console.log(wordList.slice(0, 50))

const compressed = compress(wordList)
console.log('Compressed matches original:', compressed === testString)

const likelyWordsCompressed = compress(likelyWords)

// verify that decompressing the likelyWordsCompressed matches likelyWords
const decompressedLikelyWords = decompress(likelyWordsCompressed)

console.log('Decompressed likely words matches original:', JSON.stringify(decompressedLikelyWords) === JSON.stringify(likelyWords))

fs.writeFileSync('likely-words-compressed.txt', likelyWordsCompressed)