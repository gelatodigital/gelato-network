const ClaimBot = require('../../src/bots/ClaimBot')
jest.setTimeout(15000)

const testSetup = require('../helpers/testSetup')
const setupPromise = testSetup()

const MARKETS = [
  { tokenA: 'WETH', tokenB: 'RDN' },
  { tokenA: 'WETH', tokenB: 'OMG' }
]

let claimBot
beforeAll(async () => {
  const { dxTradeService } = await setupPromise

  // we wrap functions we will mock with jest.fn
  dxTradeService.claimAll = jest.fn(dxTradeService.claimAll)
})

beforeEach(async () => {
  await setupPromise

  claimBot = new ClaimBot({
    name: 'ClaimBot',
    markets: MARKETS,
    botAddress: '0x123',
    notifications: [],
    cronSchedule: '00  02,06,10,14,18,22  *  *  *',
    autoClaimAuctions: 90
  })

  claimBot._doClaim = jest.fn(claimBot._doClaim)

  await claimBot.init()
  await claimBot.start()
})

afterEach(() => {
  claimBot.stop()
})

test('It should not notify if there is nothing to claim.', async () => {
  expect.assertions(5)

  // we mock claim function
  const CLAIM_FN = claimBot._dxTradeService.claimAll
  CLAIM_FN.mockClear()
  CLAIM_FN.mockImplementationOnce(_claimAllWithNothingToClaim)
  // we mock notify function
  claimBot._notifyClaimedTokens = jest.fn(claimBot._notifyClaimedTokens)
  const NOTIFY_FN = claimBot._notifyClaimedTokens

  // GIVEN a never notified claim
  expect(CLAIM_FN).toHaveBeenCalledTimes(0)
  expect(NOTIFY_FN).toHaveBeenCalledTimes(0)

  // WHEN we check if we have pending claims
  const CHECK_CLAIM = claimBot._doClaim()

  // THEN no claim is done and should not notify
  await CHECK_CLAIM.then(result => {
    expect(result).toMatchObject(NO_CLAIM_RESPONSE)
  })
  expect(CLAIM_FN).toHaveBeenCalledTimes(1)
  expect(NOTIFY_FN).toHaveBeenCalledTimes(0)
})

test('It should notify after claiming.', async () => {
  expect.assertions(5)
  // we mock claim function
  const CLAIM_FN = claimBot._dxTradeService.claimAll
  CLAIM_FN.mockClear()
  CLAIM_FN.mockImplementationOnce(_claimAll)
  // we mock notify function
  claimBot._notifyClaimedTokens = jest.fn(claimBot._notifyClaimedTokens)
  const NOTIFY_FN = claimBot._notifyClaimedTokens

  // GIVEN a never checked balances for deposit
  expect(CLAIM_FN).toHaveBeenCalledTimes(0)
  expect(NOTIFY_FN).toHaveBeenCalledTimes(0)

  // WHEN we check for funds for depositing
  const CHECK_CLAIM = claimBot._doClaim()

  // THEN the funds were deposited correctly
  await CHECK_CLAIM.then(result => {
    expect(result).toBeTruthy()
  })

  expect(CLAIM_FN).toHaveBeenCalledTimes(1)
  expect(NOTIFY_FN).toHaveBeenCalledTimes(1)
})

test('It should handle errors if something goes wrong while claiming.', async () => {
  expect.assertions(2)

  // we mock claim function to throw an error
  const CLAIM_FN = claimBot._dxTradeService.claimAll
  CLAIM_FN.mockImplementationOnce(_promiseReject)

  claimBot._handleError = jest.fn(claimBot._handleError)
  const HANDLE_ERROR_FN = claimBot._handleError

  // GIVEN never called handling error function
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(0)

  // WHEN we check and deposit funds but an error is thrown
  await claimBot._doClaim()

  // THEN handling error function is called
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(1)
})

const NO_CLAIM_RESPONSE = {
  claimAmounts: [],
  claimSellerTransactionResult: undefined,
  claimBuyerTransactionResult: undefined
}

function _claimAllWithNothingToClaim ({ tokenPairs, address, lastNAuctions }) {
  return Promise.resolve(NO_CLAIM_RESPONSE)
}

const CLAIMED_FUNDS_RESPONSE = {
  claimAmounts: [{
    tokenA: 'WETH',
    tokenB: 'RDN',
    totalSellerClaims: 13.12,
    totalBuyerClaims: 6400
  }],
  claimSellerTransactionResult: {
    tx: '0x4321'
  },
  claimBuyerTransactionResult: {
    tx: '0x1234'
  }
}

function _claimAll ({ tokenPairs, address, lastNAuctions }) {
  return Promise.resolve(CLAIMED_FUNDS_RESPONSE)
}

function _promiseReject () {
  return Promise.reject(new Error('This is an EXPECTED test error'))
}
