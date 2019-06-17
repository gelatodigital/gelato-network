const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')
const {
  MNEMONIC,
  RPC_URL,
  SUCCESS_RESULT,
  ERROR_EXCEPTION,
  SUCCESS_ASYNC_FN,
  ERROR_ASYNC_FN,
  RPC_GET_VERSION_PARAMS
} = require('../testUtil')

let wallet
beforeAll(() => {
  wallet = new HDWalletProvider({
    mnemonic: MNEMONIC,
    url: RPC_URL
  })

  // Mock send async function
  wallet.engine.sendAsync = jest.fn()
})

beforeEach(() => {
  jest.resetAllMocks()
})

describe('Get version, delegates the to the wallet', () => {
  test('Successful request', done => {
    // GIVEN: An engine that succeed on sendAsync
    wallet.engine.sendAsync.mockImplementation(SUCCESS_ASYNC_FN)

    // WHEN: Sending a "get version" call
    wallet.sendAsync(RPC_GET_VERSION_PARAMS, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      expect(params).toBe(RPC_GET_VERSION_PARAMS)

      // THEN: The result is returned
      expect(result).toBe(SUCCESS_RESULT)
      expect(error).toBeFalsy()

      done()
    })
  })

  test('Erroneus requests', done => {
    // GIVEN: An engine that succeed on sendAsync
    wallet.engine.sendAsync.mockImplementation(ERROR_ASYNC_FN)

    // WHEN: Sending a "get version" call
    wallet.sendAsync(RPC_GET_VERSION_PARAMS, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      expect(params).toBe(RPC_GET_VERSION_PARAMS)

      // THEN: The result is returned
      expect(error).toBe(ERROR_EXCEPTION)
      expect(result).toBeFalsy()

      done()
    })
  })
})
