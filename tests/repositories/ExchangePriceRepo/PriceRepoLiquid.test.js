const PriceRepoLiquid = require('../../../src/repositories/PriceRepo/feeds/PriceRepoLiquid')
const priceRepo = new PriceRepoLiquid({})

// class HTTPError extends Error {}

test('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(2)
  // WHEN we query for GEN-ETH pair (being ETH tokenB)
  let genEthPrice = await priceRepo.getPrice({
    tokenA: 'GEN',
    tokenB: 'ETH'
  })
  // WHEN we query for ETH-GEN asking (being ETH tokenA)
  let ethGENPrice = await priceRepo.getPrice({
    tokenA: 'ETH',
    tokenB: 'GEN'
  })

  // THEN In both cases we get a price number
  // It's important because in Liquid token order matters
  expect(genEthPrice).toMatch(/\d*\.?\d+/)
  expect(ethGENPrice).toMatch(/\d*\.?\d+/)
})

test('It should throw an error for unknown Crypto markets', async () => {
  expect.assertions(1)
  try {
    await priceRepo.getPrice({ tokenA: 'XBT', tokenB: 'OMG' })
  } catch (e) {
    expect(e).toEqual(
      new Error(
        'No matching markets in Liquid: XBT-OMG'
      )
    )
  }
})
