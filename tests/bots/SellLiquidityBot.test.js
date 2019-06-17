const SellLiquidityBot = require('../../src/bots/SellLiquidityBot')
const testSetup = require('../helpers/testSetup')
jest.setTimeout(15000)

const BigNumber = require('bignumber.js')

const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]

const setupPromise = testSetup()

let sellLiquidityBot

beforeAll(async done => {
  await setupPromise

  sellLiquidityBot = new SellLiquidityBot({
    name: 'SellLiquidityBot',
    botAddress: '0x123',
    markets: MARKETS,
    notifications: []
  })

  jest.useFakeTimers()

  await sellLiquidityBot.init()
  await sellLiquidityBot.start()

  // Wait until everything is ready to go
  done()
})

afterAll(() => {
  sellLiquidityBot.stop()
})

test('It should do a routine check.', async () => {
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidity)
  const ENSURE_SELL_LIQUIDITY = sellLiquidityBot._liquidityService.ensureSellLiquidity

  // GIVEN never ensured liquidity market
  expect(ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)

  // WHEN we wait for an expected time
  jest.runOnlyPendingTimers()

  // THEN bot autochecked liquidity for all markets just in case
  expect(ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(2)
})

test('It should trigger ensure liquidity from eventBus trigger', () => {
  expect.assertions(4)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidity)
  const SERVICE_ENSURE_SELL_LIQUIDITY = sellLiquidityBot._liquidityService.ensureSellLiquidity

  // we wrap expected eventBus triggered function with mock
  sellLiquidityBot._ensureSellLiquidity = jest.fn(sellLiquidityBot._ensureSellLiquidity)
  const BOT_ENSURE_SELL_LIQUIDITY = sellLiquidityBot._ensureSellLiquidity

  // GIVEN uncalled liquidity functions
  expect(BOT_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)
  expect(SERVICE_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)

  // WHEN we trigger 'auction:cleared' event
  sellLiquidityBot._eventBus.trigger('auction:cleared', {
    buyToken: 'RDN', sellToken: 'WETH'
  })

  // THEN liquidity ensuring functions have been called
  expect(BOT_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(1)
  expect(SERVICE_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(1)
})

test('It should not ensure liquidity from eventBus trigger from not followed markets', () => {
  expect.assertions(4)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidity)
  const SERVICE_ENSURE_SELL_LIQUIDITY = sellLiquidityBot._liquidityService.ensureSellLiquidity

  // we wrap expected eventBus triggered function with mock
  sellLiquidityBot._ensureSellLiquidity = jest.fn(sellLiquidityBot._ensureSellLiquidity)
  const BOT_ENSURE_SELL_LIQUIDITY = sellLiquidityBot._ensureSellLiquidity

  // GIVEN uncalled liquidity functions
  expect(BOT_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)
  expect(SERVICE_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)

  // WHEN we trigger 'auction:cleared' event
  sellLiquidityBot._eventBus.trigger('auction:cleared', {
    buyToken: 'DAI', sellToken: 'WETH'
  })

  // THEN liquidity ensuring functions have been called
  expect(BOT_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)
  expect(SERVICE_ENSURE_SELL_LIQUIDITY).toHaveBeenCalledTimes(0)
})

test('It should not ensure liquidity if already ensuring liquidity.', () => {
  expect.assertions(1)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = _concurrentLiquidityEnsured

  // GIVEN a running bot

  // WHEN we ensure liquidity
  const ENSURE_LIQUIDITY = sellLiquidityBot._ensureSellLiquidity({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN liquidiy is ensured correctly
  ENSURE_LIQUIDITY.then(result => {
    expect(result).toBeFalsy()
  })
})

test('It should ensure liquidity.', () => {
  expect.assertions(3)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidity)
  const ENSURE_SELL_LIQUIDITY_FN = sellLiquidityBot._liquidityService.ensureSellLiquidity

  // GIVEN never ensured liquidity  market
  expect(ENSURE_SELL_LIQUIDITY_FN).toHaveBeenCalledTimes(0)

  // WHEN we ensure liquidity
  const ENSURE_LIQUIDITY = sellLiquidityBot._ensureSellLiquidity({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN liquidity is ensured correctly
  ENSURE_LIQUIDITY.then(result => {
    expect(result).toBeTruthy()
  })
  expect(ENSURE_SELL_LIQUIDITY_FN).toHaveBeenCalledTimes(1)
})

test('It should handle errors if something goes wrong.', () => {
  expect.assertions(3)
  // we mock ensureSellLiquidity function
  sellLiquidityBot._liquidityService.ensureSellLiquidity = jest.fn(_ensureLiquidityError)
  sellLiquidityBot._handleError = jest.fn(sellLiquidityBot._handleError)
  const HANDLE_ERROR_FN = sellLiquidityBot._handleError

  // GIVEN never called handling error function
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(0)

  // WHEN we ensure liquidity but an error is thrown
  const ENSURE_LIQUIDITY = sellLiquidityBot._ensureSellLiquidity({
    buyToken: 'RDN', sellToken: 'WETH', from: '0x123'
  })

  // THEN liquidity can't be ensured
  ENSURE_LIQUIDITY.then(result => {
    expect(result).toBeFalsy()
  })
  // THEN handling error function is called
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(1)
})

function _concurrentLiquidityEnsured ({ sellToken, buyToken, from }) {
  return Promise.resolve([])
}

function _ensureLiquidity ({ sellToken, buyToken, from }) {
  return Promise.resolve([{
    sellToken,
    buyToken,
    amount: new BigNumber('522943983903581200'),
    amountInUSD: new BigNumber('523.97')
  }])
}

function _ensureLiquidityError ({ sellToken, buyToken, from }) {
  throw Error('This is an EXPECTED test error')
}
