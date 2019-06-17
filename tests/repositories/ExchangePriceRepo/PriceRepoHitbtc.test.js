const PriceRepoHitbtc = require('../../../src/repositories/PriceRepo/feeds/PriceRepoHitbtc')
const priceRepo = new PriceRepoHitbtc({})

// class HTTPError extends Error {}

test('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(2)
  // WHEN we query for MKR-ETH pair (being ETH tokenB)
  let mkrEthPrice = await priceRepo.getPrice({
    tokenA: 'MKR', tokenB: 'ETH' })
  // WHEN we query for ETH-MKR asking (being ETH tokenA)
  let ethMKRPrice = await priceRepo.getPrice({
    tokenA: 'ETH', tokenB: 'MKR' })

  // THEN In both cases we get a price number
  // It's important because in HitBTC token order matters
  expect(mkrEthPrice).toMatch(/\d*\.?\d+/)
  expect(ethMKRPrice).toMatch(/\d*\.?\d+/)
})

test('It should throw an error for unknown Crypto markets', async () => {
  expect.assertions(1)
  try {
    await priceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(
      new Error('No matching markets in HitBTC: XBT-OMG. tokenA-ETH exist: false tokenB-ETH exist: true'))
  }
})
