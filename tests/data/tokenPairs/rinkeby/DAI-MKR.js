module.exports =
// DAI-WETH
{
  // DAI
  tokenA: {
    address: '0x1638578de407719a486db086b36b53750db0199e',
    funding: 0
  },
  // MKR
  tokenB: {
    address: '0xe315cb6fa401092a7ecc92f05c62d05a974012f4',
    funding: 20
  },
  // Price: https://www.coingecko.com/en/price_charts/dai/eth
  initialPrice: {
    numerator: 1,
    denominator: 600
  }
}
