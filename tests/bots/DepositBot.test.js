const DepositBot = require('../../src/bots/DepositBot')
const testSetup = require('../helpers/testSetup')
jest.setTimeout(15000)

const BigNumber = require('bignumber.js')

const TOKENS = ['WETH', 'RDN']

const setupPromise = testSetup()

let depositBot
beforeAll(async () => {
  const { dxInfoService, dxTradeService } = await setupPromise

  // we wrap functions we will mock with jest.fn
  dxInfoService.getBalanceOfEther =
    jest.fn(dxInfoService.getBalanceOfEther)

  dxInfoService.getAccountBalancesForTokensNotDeposited =
    jest.fn(dxInfoService.getAccountBalancesForTokensNotDeposited)

  dxTradeService.deposit = jest.fn(dxTradeService.deposit)
})

beforeEach(async () => {
  await setupPromise

  depositBot = new DepositBot({
    name: 'DepositBot',
    tokens: TOKENS,
    botAddress: '0x123',
    notifications: []
  })

  depositBot._depositFunds = jest.fn(depositBot._depositFunds)
    .mockReturnValueOnce(true)
  await depositBot.init()
  await depositBot.start()
})

afterEach(() => {
  depositBot.stop()
})

// FIXME: Bad mixture of promises and fake timers it doesn't work
// test('It should do a routine check.', async () => {
//   jest.useFakeTimers()
//
//   // we mock getAccountBalancesForTokensNotDeposited function
//   depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited = jest.fn(_getAccountBalancesForTokensNotDeposited)
//   const GET_TOKEN_BALANCES_FN = depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
//
//   // GIVEN never ensured liquidity market
//   expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(0)
//
//   // WHEN we wait for an expected time
//   jest.runOnlyPendingTimers()
//
//   // THEN bot autochecked liquidity for all markets just in case
//   // expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(2)
// })

test('It should not do a deposit if nothing to deposit.', async () => {
  expect.assertions(7)

  // we mock getBalanceOfEther function
  const GET_ETHER_BALANCE_FN = depositBot._dxInfoService.getBalanceOfEther
  GET_ETHER_BALANCE_FN.mockImplementationOnce(_getEtherBalanceWithNoEthToDeposit)

  // we mock getAccountBalancesForTokensNotDeposited function
  const GET_TOKEN_BALANCES_FN =
    depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
  GET_TOKEN_BALANCES_FN.mockImplementationOnce(_getAccountBalancesWithNoTokensToDeposit)

  // we mock deposit function
  const DEPOSIT_FN = depositBot._dxTradeService.deposit
  DEPOSIT_FN.mockImplementationOnce(_deposit)

  // GIVEN a never checked balances for deposit
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(0)
  expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(0)
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)

  // WHEN we check for funds for depositing
  const CHECK_DEPOSIT = depositBot._depositFunds()

  // THEN no deposit should be done because there are no funds
  await CHECK_DEPOSIT.then(result => {
    expect(result).toBeFalsy()
  })
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(1)
  expect(GET_TOKEN_BALANCES_FN).toHaveBeenCalledTimes(1)
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)
})

test('It should deposit Ether and tokens.', async () => {
  expect.assertions(3)
  // we mock deposit function
  const DEPOSIT_FN = depositBot._dxTradeService.deposit
  DEPOSIT_FN.mockImplementationOnce(_deposit)

  // we mock getBalanceOfEther function
  const GET_ETHER_BALANCE_FN = depositBot._dxInfoService.getBalanceOfEther
  GET_ETHER_BALANCE_FN.mockImplementationOnce(_getEtherBalanceWithEthToDeposit)

  // we mock getAccountBalancesForTokensNotDeposited function
  const GET_TOKEN_BALANCES_FN =
    depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
  GET_TOKEN_BALANCES_FN.mockImplementationOnce(_getAccountBalancesForTokensNotDeposited)

  // GIVEN a never checked balances for deposit
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(0)

  // WHEN we check for funds for depositing
  const CHECK_DEPOSIT = depositBot._depositFunds()

  // THEN the funds were deposited correctly
  await CHECK_DEPOSIT.then(result => {
    expect(result).toBeTruthy()
  })
  expect(DEPOSIT_FN).toHaveBeenCalledTimes(2)
})

test('It should handle errors if something goes wrong while checking balances.', async () => {
  expect.assertions(3)
  // we mock deposit function to throw an error
  const GET_ETHER_BALANCE_FN = depositBot._dxInfoService.getBalanceOfEther
  GET_ETHER_BALANCE_FN.mockClear()
  GET_ETHER_BALANCE_FN.mockImplementationOnce(_forceError)

  // GIVEN never called get balances function
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(0)

  // WHEN we check balances but an error is thrown
  const CHECK_DEPOSIT = depositBot._depositFunds()

  // THEN we can't finish depositing funds
  await CHECK_DEPOSIT.then(result => {
    expect(result).toBeFalsy()
  })
  // THEN function was called once but errored
  expect(GET_ETHER_BALANCE_FN).toHaveBeenCalledTimes(1)
})

test('It should handle errors if something goes wrong while depositing.', async () => {
  expect.assertions(2)

  // we mock getBalanceOfEther function
  const GET_ETHER_BALANCE_FN = depositBot._dxInfoService.getBalanceOfEther
  GET_ETHER_BALANCE_FN.mockImplementationOnce(_getEtherBalanceWithNoEthToDeposit)

  // we mock getAccountBalancesForTokensNotDeposited function
  const GET_TOKEN_BALANCES_FN =
    depositBot._dxInfoService.getAccountBalancesForTokensNotDeposited
  GET_TOKEN_BALANCES_FN.mockImplementationOnce(_getAccountBalancesForTokensNotDeposited)

  // we mock deposit function to throw an error
  const DEPOSIT_FN = depositBot._dxTradeService.deposit
  DEPOSIT_FN.mockImplementationOnce(_promiseReject)

  depositBot._handleError = jest.fn(depositBot._handleError)
  const HANDLE_ERROR_FN = depositBot._handleError

  // GIVEN never called handling error function
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(0)

  // WHEN we check and deposit funds but an error is thrown
  await depositBot._depositFunds()

  // THEN handling error function is called
  expect(HANDLE_ERROR_FN).toHaveBeenCalledTimes(1)
})

function _getAccountBalancesForTokensNotDeposited ({ tokens, account }) {
  return Promise.resolve([{
    token: 'RDN',
    amount: new BigNumber('522943983903581200')
  }])
}

function _getEtherBalanceWithNoEthToDeposit ({ account }) {
  return Promise.resolve(
    new BigNumber('0')
  )
}

function _getEtherBalanceWithEthToDeposit ({ account }) {
  return Promise.resolve(
    new BigNumber('50000000000000000000')
  )
}

function _getAccountBalancesWithNoTokensToDeposit ({ tokens, account }) {
  return Promise.resolve([{
    token: 'RDN',
    amount: new BigNumber('0')
  }])
}

function _deposit ({ token, amount, accounAddress }) {
  return Promise.resolve([])
}

function _promiseReject () {
  return Promise.reject(new Error('This is an EXPECTED test error'))
}

function _forceError () {
  throw Error('This is an EXPECTED test error')
}
