const blocks = []

function _generateBlocks () {
  const initDate = new Date('2018-01-01Z00:00')
  for (let i = 0; i < 100; i++) {
    // Create new Date
    let date = new Date(
      initDate.getTime() + // Based in initDate
      (i * 13 * 1000) + // Add at least 13 seconds between block
      (i % 5 * 1000)) // Use pseudo-random param to have difference between block seconds
    let newBlock = {
      number: i,
      timestamp: date.getTime() / 1000 // time in seconds
    }
    blocks.push(newBlock)
  }
  // return blocks
}

_generateBlocks()

module.exports = {
  blocks
}
