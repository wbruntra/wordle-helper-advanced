export default function Guess({ guess }) {
  const getClasses = (k) => {
    switch (k) {
      case 'G':
        return 'letter-box green'
      case 'Y':
        return 'letter-box yellow'
      case 'U':
        return 'letter-box gray'
      default:
        return 'letter-box white'
    }
  }

  const key = guess.key ? guess.key.split('') : '-----'.split('')

  return (
    <>
      {key.map((c, i) => {
        return (
          <div key={`letter-${i}`} className={`${getClasses(c)}`}>
            {guess.word[i]}
          </div>
        )
      })}
    </>
  )
}
