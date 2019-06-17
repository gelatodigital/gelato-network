const PriceRepoBinance = require('../../../src/repositories/PriceRepo/feeds/PriceRepoBinance')
const priceRepo = new PriceRepoBinance({})

// class HTTPError extends Error {}

test('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(2)
  // WHEN we query for RDN-ETH pair (being ETH tokenB)
  let rdnEthPrice = await priceRepo.getPrice({
    tokenA: 'RDN', tokenB: 'ETH' })
  // WHEN we query for ETH-RDN asking (being ETH tokenA)
  let ethRDNPrice = await priceRepo.getPrice({
    tokenA: 'ETH', tokenB: 'RDN' })

  // THEN In both cases we get a price number
  // It's important because in Binance token order matters
  expect(rdnEthPrice).toMatch(/\d*\.?\d+/)
  expect(ethRDNPrice).toMatch(/\d*\.?\d+/)
})

test('It should throw an error for unknown Crypto markets', async () => {
  expect.assertions(1)
  try {
    await priceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(
      new Error('No matching markets in Binance: XBT-OMG. tokenA-ETH exist: false tokenB-ETH exist: true'))
  }
})
