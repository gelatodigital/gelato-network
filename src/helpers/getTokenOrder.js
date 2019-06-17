function getTokenOrder (tokenA, tokenB) {
  if (tokenA < tokenB) {
    return [ tokenA, tokenB ]
  } else {
    return [ tokenB, tokenA ]
  }
}

module.exports = getTokenOrder
