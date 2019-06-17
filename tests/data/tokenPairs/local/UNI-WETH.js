module.exports =
// UNI-WETH
{
  // UNI
  tokenA: {
    address: '0x9f544a3fc3d1045e6ec49d4ecef6dcd700457165',
    funding: 10
  },
  // WETH
  tokenB: {
    address: '0x9fbda871d559710256a2502a2517b794b482db40',
    funding: 10
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 1
  }
}
