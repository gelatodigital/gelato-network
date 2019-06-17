const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')
const {
  MNEMONIC,
  PRIVATE_KEYS,
  ACCOUNTS,
  RPC_URL
} = require('../testUtil')
const [ACCOUNT_1, ACCOUNT_2, ACCOUNT_3] = ACCOUNTS

const WALLET_DEFAULTS = {
  url: RPC_URL,
  addressIndex: 0,
  numAddresses: 3,
  shareNonce: true,
  blockForNonceCalculation: 'pending'
}

describe('Constructor validations', () => {
  test('It throws an error if no mnemonic or private key was provided', () => {
    expect(() => new HDWalletProvider({
      ...WALLET_DEFAULTS
    })).toThrow()
  })
})

describe('Mnemonic account setup', () => {
  test('It generate 1 account', () => {
    // GIVEN: A mnemonic and numAddresses=1
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 1,
      mnemonic: MNEMONIC
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: It returns the right address
    expect(wallet.getAddresses()).toEqual([ACCOUNT_1])
  })

  test('It generate 3 accounts', () => {
    // GIVEN: A mnemonic and numAddresses=3
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 3,
      mnemonic: MNEMONIC
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: The addresses are the expected ones
    expect(wallet.getAddresses()).toEqual(ACCOUNTS)
    expect(wallet.getAddress(0)).toEqual(ACCOUNT_1)
    expect(wallet.getAddress(1)).toEqual(ACCOUNT_2)
    expect(wallet.getAddress(2)).toEqual(ACCOUNT_3)
  })
})

describe('Private key account setup', () => {
  // Applies only to tests in this describe block
  test('It generate 1 account', () => {
    // GIVEN: A private key
    const pk3 = PRIVATE_KEYS[2]
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 1,
      privateKeys: [pk3]
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: Returns the expected address
    expect(wallet.getAddresses()).toEqual([ACCOUNT_3])
  })

  test('It generate 3 accounts', () => {
    // GIVEN: A tree private keys
    const config = {
      ...WALLET_DEFAULTS,
      numAddresses: 3,
      privateKeys: PRIVATE_KEYS
    }

    // WHEN: Creating the wallet
    const wallet = new HDWalletProvider(config)

    // THEN: Returns the expected addresses
    expect(wallet.getAddresses()).toEqual(ACCOUNTS)
    expect(wallet.getAddress(0)).toEqual(ACCOUNT_1)
    expect(wallet.getAddress(1)).toEqual(ACCOUNT_2)
    expect(wallet.getAddress(2)).toEqual(ACCOUNT_3)
  })
})
