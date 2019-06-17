const PriceRepoKraken = require('../../../src/repositories/PriceRepo/feeds/PriceRepoKraken')
const priceRepo = new PriceRepoKraken({})

test.skip('It should return a price for known Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(3)
  expect(await priceRepo.getPrice({tokenA: 'ETH', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
  expect(await priceRepo.getPrice({tokenA: 'ETH', tokenB: 'USD'})).toMatch(/\d*\.?\d+/)
  expect(await priceRepo.getPrice({tokenA: 'XDG', tokenB: 'XBT'})).toMatch(/\d*\.?\d+/)
})

test.skip('It should throw an error for unknown Crypto markets', async () => {
  jest.setTimeout(10000)
  expect.assertions(1)
  try {
    await priceRepo.getPrice({tokenA: 'XBT', tokenB: 'OMG'})
  } catch (e) {
    expect(e).toEqual(Error('Query:Unknown asset pair'))
  }
})
