const HDWalletSafeProvider = require('../../src/helpers/web3Providers/HDWalletSafeProvider')
const {
  MNEMONIC,
  PRIVATE_KEYS,
  ACCOUNTS,
  ADDRESS_2: SAFE_ADDRESS_1,
  ADDRESS_3: SAFE_MODULE_ADDRESS_1,
  ADDRESS_4: SAFE_ADDRESS_2,
  ADDRESS_5: SAFE_MODULE_ADDRESS_2,
  ADDRESS_6: SAFE_ADDRESS_3,
  ADDRESS_7: SAFE_MODULE_ADDRESS_3,
  RPC_URL
} = require('../testUtil')
const [OPERATOR_ADDRESS_1, OPERATOR_ADDRESS_2, OPERATOR_ADDRESS_3] = ACCOUNTS
const [PK1, PK2, PK3] = PRIVATE_KEYS

const WALLET_DEFAULTS = {
  url: RPC_URL,
  addressIndex: 0,
  numAddresses: 3,
  shareNonce: true,
  blockForNonceCalculation: 'pending'
}

const SAFE_CONFIG = {
  operatorAddressIndex: 0,
  safeAddress: SAFE_ADDRESS_1,
  safeModuleType: 'complete',
  safeModuleAddress: SAFE_MODULE_ADDRESS_1
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('Constructor validations', () => {
  test('It throws an error if no mnemonic or private key was provided', () => {
    expect(() => new HDWalletSafeProvider({
      ...WALLET_DEFAULTS
    })).toThrow()
  })
})

describe('Safe using mnemonic', () => {
  test('One operator, one safe', () => {
    // GIVEN: one safe
    const safes = [SAFE_CONFIG]

    // GIVEN: A mnemonic for a single operator and a safe config
    const config = {
      ...WALLET_DEFAULTS,
      mnemonic: MNEMONIC,
      numAddresses: 1,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: It returns the safes address (not the operator)
    expect(wallet.getAddresses()).toEqual([SAFE_ADDRESS_1])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)

    // THEN: The effective account is the operator
    expect(wallet.addresses).toEqual([OPERATOR_ADDRESS_1])
  })

  test('Tree operator, one safe', () => {
    // GIVEN: one safe
    const safes = [SAFE_CONFIG]

    // GIVEN: A mnemonic with tree operators
    const config = {
      ...WALLET_DEFAULTS,
      mnemonic: MNEMONIC,
      numAddresses: 3,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: The the only account is the one of the safe
    expect(wallet.getAddresses()).toEqual([SAFE_ADDRESS_1])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)

    // THEN: The effective accounts are the operators
    expect(wallet.addresses).toEqual([
      OPERATOR_ADDRESS_1,
      OPERATOR_ADDRESS_2,
      OPERATOR_ADDRESS_3
    ])
  })

  test('Two operators, tree safes', () => {
    // GIVEN: tree safe for two operators
    const safes = [
      // Operator 1
      {
        operatorAddressIndex: 0,
        safeAddress: SAFE_ADDRESS_1,
        safeModuleAddress: SAFE_MODULE_ADDRESS_2
      }, {
        operatorAddressIndex: 0,
        safeAddress: SAFE_ADDRESS_2,
        safeModuleAddress: SAFE_MODULE_ADDRESS_3
      },
      // Operator 2
      {
        operatorAddressIndex: 1,
        safeAddress: SAFE_ADDRESS_3,
        safeModuleAddress: SAFE_MODULE_ADDRESS_3
      }
    ]

    // GIVEN: A mnemonic with tree operators
    const config = {
      ...WALLET_DEFAULTS,
      mnemonic: MNEMONIC,
      numAddresses: 2,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: The the only account is the one of the safe
    expect(wallet.getAddresses()).toEqual([
      SAFE_ADDRESS_1,
      SAFE_ADDRESS_2,
      SAFE_ADDRESS_3
    ])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)
    expect(wallet.getAddress(1)).toEqual(SAFE_ADDRESS_2)
    expect(wallet.getAddress(2)).toEqual(SAFE_ADDRESS_3)

    // THEN: The operator are
    // THEN: The effective accounts are the operators
    expect(wallet.addresses).toEqual([
      OPERATOR_ADDRESS_1,
      OPERATOR_ADDRESS_2
    ])
  })
})

describe('Private key account setup', () => {
  // Applies only to tests in this describe block
  test('One operator, one safe', () => {
    // GIVEN: one safe
    const safes = [SAFE_CONFIG]

    // GIVEN: A private key for a single operator and a safe config
    const config = {
      ...WALLET_DEFAULTS,
      privateKeys: [PK1],
      numAddresses: 1,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: It returns the safes address (not the operator)
    expect(wallet.getAddresses()).toEqual([SAFE_ADDRESS_1])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)

    // THEN: The effective account is the operator
    expect(wallet.addresses).toEqual([OPERATOR_ADDRESS_1])
  })

  test('Tree operator, one safe', () => {
    // GIVEN: one safe
    const safes = [SAFE_CONFIG]

    // GIVEN: tree private keys for the tree operators
    const config = {
      ...WALLET_DEFAULTS,
      privateKeys: [PK1, PK2, PK3],
      numAddresses: 3,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: The the only account is the one of the safe
    expect(wallet.getAddresses()).toEqual([SAFE_ADDRESS_1])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)

    // THEN: The effective accounts are the operators
    expect(wallet.addresses).toEqual([
      OPERATOR_ADDRESS_1,
      OPERATOR_ADDRESS_2,
      OPERATOR_ADDRESS_3
    ])
  })

  test('Two operators, tree safes', () => {
    // GIVEN: tree safe for two operators
    const safes = [
      // Operator 1
      {
        operatorAddressIndex: 0,
        safeAddress: SAFE_ADDRESS_1,
        safeModuleAddress: SAFE_MODULE_ADDRESS_2
      }, {
        operatorAddressIndex: 0,
        safeAddress: SAFE_ADDRESS_2,
        safeModuleAddress: SAFE_MODULE_ADDRESS_3
      },
      // Operator 2
      {
        operatorAddressIndex: 1,
        safeAddress: SAFE_ADDRESS_3,
        safeModuleAddress: SAFE_MODULE_ADDRESS_3
      }
    ]

    // GIVEN: two private keys for the two operators
    const config = {
      ...WALLET_DEFAULTS,
      privateKeys: [PK1, PK2],
      numAddresses: 2,
      safes
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletSafeProvider(config)

    // THEN: The the only account is the one of the safe
    expect(wallet.getAddresses()).toEqual([
      SAFE_ADDRESS_1,
      SAFE_ADDRESS_2,
      SAFE_ADDRESS_3
    ])
    expect(wallet.getAddress(0)).toEqual(SAFE_ADDRESS_1)
    expect(wallet.getAddress(1)).toEqual(SAFE_ADDRESS_2)
    expect(wallet.getAddress(2)).toEqual(SAFE_ADDRESS_3)

    // THEN: The operator are
    // THEN: The effective accounts are the operators
    expect(wallet.addresses).toEqual([
      OPERATOR_ADDRESS_1,
      OPERATOR_ADDRESS_2
    ])
  })
})
