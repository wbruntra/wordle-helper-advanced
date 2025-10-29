const fs = require('fs')
const path = require('path')

async function getPastAnswers() {
  const filePath = path.join(__dirname, 'debug/answers.html')
  const fileContent = await fs.promises.readFile(filePath, 'utf-8')
}
