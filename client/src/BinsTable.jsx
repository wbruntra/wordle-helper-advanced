import { wordsAtOrBelowLimit } from './scorers';

import _ from 'lodash'

const toPct = (fraction) => {
  return (fraction * 100).toFixed(2) + '%'
}

function BinsTable({ bins }) {
  const binSizes = bins.map((bin) => Object.values(bin)[0].length)
  const uniqueWords = _.sum(binSizes.filter((size) => size === 1))
  const limits = [5, 20]
  const summaryStats = limits.map((limit) => {
    const scorer = wordsAtOrBelowLimit(limit)
    return {
      limit,
      wordCount: scorer(binSizes),
    }
  })
  const totalWords = _.sum(binSizes)

  return (
    <>
      <table className="table table-dark table-striped mt-4 w-100">
        <thead>
          <tr>
            <th scope="col">KEY</th>
            <th scope="col">WORDS</th>
            <th scope="col"># OF MATCHES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ width: '35%' }}>Chance of unique answer</td>
            <td>{toPct(uniqueWords / totalWords)}</td>
            <td>{uniqueWords}</td>
          </tr>
          {summaryStats.map((smry) => (
            <tr key={`limit-${smry.limit}`}>
              <td>Chance of ≤ {smry.limit}</td>
              <td>{toPct(smry.wordCount / totalWords)}</td>
              <td>{smry.wordCount}</td>
            </tr>
          ))}
          {bins.map((bin, i) => {
            const matches = Object.values(bin)[0].length
            return (
              <tr key={`bin-${i}`}>
                <td>{Object.keys(bin)[0]}</td>
                <td>
                  {matches < 20
                    ? Object.values(bin)[0].join(', ')
                    : `[${matches > 600 ? 'way ' : ''}too many to show]`}
                </td>
                <td>{matches}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

export default BinsTable