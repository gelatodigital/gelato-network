const ArbitrageBot = require('../../src/bots/ArbitrageBot')
const testSetup = require('../helpers/testSetup')
jest.setTimeout(15000)

const BigNumber = require('bignumber.js')

const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]

const setupPromise = testSetup()

let arbitrageBot

beforeAll(async () => {
  try {
    await setupPromise
  } catch (error) {
    console.log(error)
    throw error
  }
  arbitrageBot = new ArbitrageBot({
    name: 'ArbitrageBot',
    botAddress: '0x123',
    markets: MARKETS,
    arbitrageContractAddress: '0x234',
    notifications: []
  })

  jest.useFakeTimers()

  await arbitrageBot.init()
  await arbitrageBot.start()
})

afterAll(() => {
  arbitrageBot.stop()
})

test('It should do a routine check.', async () => {
  // we mock checkUniswapArbitrage function
  arbitrageBot._arbitrageService.checkUniswapArbitrage = jest.fn(_checkArbitrage)
  const ENSURE_ARBITRAGE_FN = arbitrageBot._arbitrageService.checkUniswapArbitrage

  // GIVEN a never called checkUniswapArbitrage function
  expect(ENSURE_ARBITRAGE_FN).toHaveBeenCalledTimes(0)

  // WHEN we wait for an expected time
  jest.runOnlyPendingTimers()

  // THEN bot autochecked liquidity for all markets just in case
  expect(ENSURE_ARBITRAGE_FN).toHaveBeenCalledTimes(2)
})

test('It should not run arbitrage if already running arbitrage.', () => {
  expect.assertions(1)
  // we mock checkUniswapArbitrage function
  arbitrageBot._arbitrageService.checkUniswapArbitrage = _concurrentArbitrageCheck

  // GIVEN a running bot

  // WHEN we buy remaining liquidity
  const ENSURE_ARBITRAGE = arbitrageBot._arbitrageCheck({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN concurrency is detected and do nothing
  ENSURE_ARBITRAGE.then(result => {
    expect(result).toBeTruthy()
  })
})

test('It should run when called', async () => {
  expect.assertions(3)
  // we mock checkUniswapArbitrage function
  arbitrageBot._arbitrageService.checkUniswapArbitrage = jest.fn(_checkArbitrage)
  const ENSURE_ARBITRAGE_FN = arbitrageBot._arbitrageService.checkUniswapArbitrage

  // GIVEN never arbitrage
  expect(ENSURE_ARBITRAGE_FN).toHaveBeenCalledTimes(0)

  // WHEN we arbitrage
  const ENSURE_ARBITRAGE = arbitrageBot._arbitrageCheck({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN arbitrage is ensured correctly
  const result = await ENSURE_ARBITRAGE
  expect(result).toBeTruthy()
  expect(ENSURE_ARBITRAGE_FN).toHaveBeenCalledTimes(1)
})

test('It should handle errors if something goes wrong.', async () => {
  expect.assertions(3)
  // we mock checkUniswapArbitrage function
  arbitrageBot._arbitrageService.checkUniswapArbitrage = jest.fn(_arbitrageCheckError)
  arbitrageBot._handleError = jest.fn(arbitrageBot._handleError)
  const HANDLE_ERROR_FN = arbitrageBot._handleError

  // GIVEN never called handling error function
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(0)

  // WHEN we ensure liquidity but an error is thrown
  const ENSURE_ARBITRAGE = arbitrageBot._arbitrageCheck({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN liquidity can't be ensured
  const result = await ENSURE_ARBITRAGE
  expect(result).toBeFalsy()
  // THEN handling error function is called
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(1)
})

function _concurrentArbitrageCheck ({ sellToken, buyToken, from }) {
  return Promise.resolve([])
}

function _checkArbitrage ({ sellToken, buyToken, from }) {
  return Promise.resolve([{
    type: 'UniswapOpportunity',
    arbToken: buyToken,
    amount: new BigNumber('522943983903581200'),
    expectedProfit: '0',
    actualProfit: '0',
    dutchPrice: '0',
    uniswapPrice: '0',
    tx: {
      receipt: {
        logs: []
      }
    }
  }, {
    type: 'DutchOpportunity',
    arbToken: sellToken,
    amount: new BigNumber('522943983903581200'),
    expectedProfit: '0',
    actualProfit: '0',
    dutchPrice: '0',
    uniswapPrice: '0',
    tx: {
      receipt: {
        logs: []
      }
    }
  }])
}

function _arbitrageCheckError ({ sellToken, buyToken, from }) {
  throw Error('This is an EXPECTED test error')
}
