const HDWalletSafeProvider = require('../../src/helpers/web3Providers/HDWalletSafeProvider')
const {
  MNEMONIC,
  ACCOUNTS,
  ADDRESS_2: SAFE_ADDRESS_1,
  ADDRESS_3: SAFE_MODULE_ADDRESS_1,
  ADDRESS_4: SAFE_ADDRESS_2,
  ADDRESS_5: SAFE_MODULE_ADDRESS_2,
  ADDRESS_6: SAFE_ADDRESS_3,
  ADDRESS_7: SAFE_MODULE_ADDRESS_3,
  ADDRESS_8: SAFE_ADDRESS_4,
  ADDRESS_9: SAFE_MODULE_ADDRESS_4,
  RPC_URL,
  SUCCESS_RESULT,
  ERROR_EXCEPTION,
  SUCCESS_ASYNC_FN,
  ERROR_ASYNC_FN,
  RPC_GET_VERSION_PARAMS,
  RPC_SEND_TRANSACTION_PARAMS
} = require('../testUtil')
const [OPERATOR_ADDRESS_1, OPERATOR_ADDRESS_2, OPERATOR_ADDRESS_3] = ACCOUNTS

let wallet

beforeEach(() => {
  jest.resetAllMocks()
})

describe('4 safes setup with 3 operators', () => {
  beforeAll(() => {
    // 4 safes, for 3 operators
    wallet = new HDWalletSafeProvider({
      mnemonic: MNEMONIC,
      numAddresses: 3,
      url: RPC_URL,
      safes: [
        {
          operatorAddressIndex: 0, // Operator 1
          safeAddress: SAFE_ADDRESS_1,
          safeModuleAddress: SAFE_MODULE_ADDRESS_1
        }, {
          operatorAddressIndex: 1, // Operator 2
          safeAddress: SAFE_ADDRESS_2,
          safeModuleAddress: SAFE_MODULE_ADDRESS_2
        }, {
          operatorAddressIndex: 2, // Operator 3
          safeAddress: SAFE_ADDRESS_3,
          safeModuleAddress: SAFE_MODULE_ADDRESS_3
        }, {
          operatorAddressIndex: 0, // Operator 1
          safeAddress: SAFE_ADDRESS_4,
          safeModuleAddress: SAFE_MODULE_ADDRESS_4
        }
      ]
    })

    // Mock send async function
    wallet.engine.sendAsync = jest.fn()
  })

  describe('Get version, delegates the to the wallet', () => {
    _testGetVersion({
      testName: 'Successful request',
      sendAsyncFn: SUCCESS_ASYNC_FN,
      expectedResult: SUCCESS_RESULT,
      expectedError: null
    })

    _testGetVersion({
      testName: 'Erroneous request',
      sendAsyncFn: ERROR_ASYNC_FN,
      expectedError: ERROR_EXCEPTION,
      expectedResult: null
    })
  })

  describe('Send transaction is sent to the module, using the right operator', () => {
    _testSendTransaction({
      safeName: 'Safe 1',
      safeAddress: SAFE_ADDRESS_1,
      safeModuleAddress: SAFE_MODULE_ADDRESS_1,
      operatorName: 'Operator 1',
      operatorAddress: OPERATOR_ADDRESS_1
    })
    _testSendTransaction({
      safeName: 'Safe 2',
      safeAddress: SAFE_ADDRESS_2,
      safeModuleAddress: SAFE_MODULE_ADDRESS_2,
      operatorName: 'Operator 2',
      operatorAddress: OPERATOR_ADDRESS_2
    })
    _testSendTransaction({
      safeName: 'Safe 3',
      safeAddress: SAFE_ADDRESS_3,
      safeModuleAddress: SAFE_MODULE_ADDRESS_3,
      operatorName: 'Operator 3',
      operatorAddress: OPERATOR_ADDRESS_3
    })
    _testSendTransaction({
      safeName: 'Safe 4',
      safeAddress: SAFE_ADDRESS_4,
      safeModuleAddress: SAFE_MODULE_ADDRESS_4,
      operatorName: 'Operator 1',
      operatorAddress: OPERATOR_ADDRESS_1
    })
  })
})

function _testGetVersion ({
  testName,
  sendAsyncFn,
  expectedError,
  expectedResult
}) {
  test(testName, done => {
    // GIVEN: a 4 safes setup with 3 operators

    // GIVEN: An engine with the provided implementation
    wallet.engine.sendAsync.mockImplementation(sendAsyncFn)

    // WHEN: Sending a "get version" call
    wallet.sendAsync(RPC_GET_VERSION_PARAMS, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      expect(params).toBe(RPC_GET_VERSION_PARAMS)

      // THEN: The result matches the expected result
      if (expectedResult) {
        expect(result).toBe(expectedResult)
      } else {
        expect(result).toBeFalsy()
      }

      // THEN: The error matches the expected error
      if (expectedError) {
        expect(error).toBe(expectedError)
      } else {
        expect(error).toBeFalsy()
      }

      done()
    })
  })
}

function _testSendTransaction ({
  safeName,
  safeAddress,
  safeModuleAddress,
  operatorName,
  operatorAddress
}) {
  test(`It send transaction for "${safeName}" using "${operatorName}"`, done => {
    // GIVEN: a 4 safes setup with 3 operators

    // GIVEN: A transaction, sent from the safe address
    const transactionParams = {
      ...RPC_SEND_TRANSACTION_PARAMS,
      params: [{
        ...RPC_SEND_TRANSACTION_PARAMS.params[0],
        from: safeAddress
      }]
    }
    const paramsOriginal = transactionParams.params[0]

    // GIVEN: An sendAsync that succeed
    wallet.engine.sendAsync.mockImplementation(SUCCESS_ASYNC_FN)

    // WHEN: Sending a transaction
    wallet.sendAsync(transactionParams, (error, result) => {
      // THEN: The wallet delegates to the engine
      expect(wallet.engine.sendAsync).toHaveBeenCalledTimes(1)

      // THEN: The result matches the expected result
      expect(result).toBe(SUCCESS_RESULT)
      expect(error).toBeFalsy()

      // THEN: The transaction is sent from the operator address (instead of the safe address)
      const params = wallet.engine.sendAsync.mock.calls[0][0]
      const { from, to, value, data, gas } = params.params[0]
      expect(from).toBe(operatorAddress)
      // expect(params).toBe(transactionParams)

      // THEN: The transaction is sent to the module (instead of the original destination)
      expect(to).toBe(safeModuleAddress)

      // THEN: The transaction invokes the method executeWhitelisted
      // TODO: Analyze data!!
      // console.log('data', data)

      // THEN: The value is set to 0
      expect(value).toEqual(0)

      // THEN: The gas must be incremented at XXX
      // TODO: Implement, and fix gas problem
      // expect(gas).toBeGreaterThanOrEqual(paramsOriginal.gas)

      // THEN: The original transaction is encoded as data
      // TODO: transactionParams

      // THEN: The value, the method and the id hasn't changed
      expect(params.jsonrpc).toBe(transactionParams.jsonrpc)
      expect(params.method).toBe(transactionParams.method)
      expect(params.id).toBe(transactionParams.id)
      // expect(value).toBe(paramsOriginal.value)

      done()
    })
  })
}
