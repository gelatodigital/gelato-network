module.exports =
// DAI-WETH
{
  // DAI
  tokenA: {
    address: '0x1638578de407719a486db086b36b53750db0199e',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0xc778417e063141139fce010982780140aa0cd5ab',
    funding: 20.1
  },
  // Price: https://www.coingecko.com/en/price_charts/dai/eth
  initialPrice: {
    numerator: 1,
    denominator: 203
  }
}
