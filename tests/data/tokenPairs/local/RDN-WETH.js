module.exports =
// RDN-WETH
{
  // RDN
  tokenA: {
    address: '0xbd2c938b9f6bfc1a66368d08cb44dc3eb2ae27be',
    funding: 0
  },
  // WETH
  tokenB: {
    address: '0x9fbda871d559710256a2502a2517b794b482db40',
    funding: 9.5
  },
  // Price: https://www.coingecko.com/en/price_charts/raiden-network/eth
  initialPrice: {
    numerator: 1,
    denominator: 500
  }
}
